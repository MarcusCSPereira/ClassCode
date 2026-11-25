-- Teacher follow-up: review a student's self-reported completion (with feedback the student
-- sees) and rotate a class invite code.
begin;

-- One review per completion. Reopening deletes the completion and its review; changing the
-- evidence clears the review so the teacher looks again.
create table public.progress_reviews (
  problem_id uuid not null,
  student_id uuid not null,
  status text not null check (status in ('reviewed','changes_requested')),
  comment text check (comment is null or length(comment) between 1 and 1000),
  reviewer_id uuid not null references public.profiles(id),
  reviewed_at timestamptz not null default now(),
  primary key (problem_id, student_id),
  foreign key (problem_id, student_id) references public.progress_reports(problem_id, student_id) on delete cascade
);
alter table public.progress_reviews enable row level security;
revoke all on public.progress_reviews from public, anon, authenticated;

create function private.clear_review_on_new_evidence() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.progress_reviews where problem_id = new.problem_id and student_id = new.student_id;
  return new;
end; $$;
create trigger clear_review_on_new_evidence after update of evidence on public.progress_reports
  for each row when (old.evidence is distinct from new.evidence)
  execute function private.clear_review_on_new_evidence();
revoke execute on function private.clear_review_on_new_evidence() from public, anon, authenticated;

-- status: 'reviewed', 'changes_requested' (comment required) or 'clear' (removes the review).
create function public.review_progress(pid uuid, sid uuid, review_status text, review_comment text) returns void language plpgsql security definer set search_path = '' as $$
declare cid uuid; clean text := nullif(trim(review_comment),'');
begin
  select classroom_id into cid from public.problems where id = pid;
  if not coalesce(private.owns_class(cid),false) then raise exception 'owner_required' using errcode = '42501'; end if;
  if not exists(select 1 from public.progress_reports where problem_id = pid and student_id = sid)
    then raise exception 'report_required'; end if;
  if review_status = 'clear' then
    delete from public.progress_reviews where problem_id = pid and student_id = sid;
    return;
  end if;
  if review_status not in ('reviewed','changes_requested')
     or (review_status = 'changes_requested' and clean is null)
     or length(clean) > 1000
    then raise exception 'invalid_review'; end if;
  insert into public.progress_reviews(problem_id,student_id,status,comment,reviewer_id)
    values (pid,sid,review_status,clean,auth.uid())
  on conflict (problem_id,student_id) do update
    set status = excluded.status, comment = excluded.comment,
        reviewer_id = excluded.reviewer_id, reviewed_at = now();
end; $$;

-- A new code replaces the old one at once; enrolled students stay in the class.
create function public.rotate_invite(cid uuid) returns text language plpgsql security definer set search_path = '' as $$
declare new_code text;
begin
  if not coalesce(private.owns_class(cid),false) then raise exception 'owner_required' using errcode = '42501'; end if;
  update private.class_invites set code = replace(gen_random_uuid()::text,'-','')
    where classroom_id = cid returning code into new_code;
  return new_code;
end; $$;

create function private.review_json(pid uuid, sid uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object('status',rv.status,'comment',rv.comment,'reviewedAt',rv.reviewed_at))
    from public.progress_reviews rv where rv.problem_id = pid and rv.student_id = sid;
$$;
revoke execute on function private.review_json(uuid,uuid) from public, anon, authenticated;

-- Same contracts as 202611090001, plus the review of each completion.
create or replace function public.my_activity() returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;

  return coalesce((
    select jsonb_agg(row_json order by started_at, problem_id)
    from (
      select
        a.started_at,
        a.problem_id,
        jsonb_strip_nulls(jsonb_build_object(
          'studentId', a.student_id,
          'problemId', a.problem_id,
          'startedAt', a.started_at,
          'hintViews', coalesce((
            select jsonb_agg(
              jsonb_build_object('ordinal', hv.ordinal, 'viewedAt', hv.viewed_at)
              order by hv.ordinal, hv.viewed_at
            )
            from private.hint_views hv
            where hv.problem_id = a.problem_id and hv.student_id = a.student_id
          ), '[]'::jsonb),
          'reportedAt', r.reported_at,
          'verification', r.verification,
          'evidence', r.evidence,
          'review', private.review_json(a.problem_id, a.student_id)
        )) as row_json
      from public.attempts a
      left join public.progress_reports r
        on r.problem_id = a.problem_id and r.student_id = a.student_id
      where a.student_id = uid
    ) rows
  ), '[]'::jsonb);
end; $$;

create or replace function public.classroom_activity(cid uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(private.owns_class(cid), false) then
    raise exception 'owner_required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'roster',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'studentId', e.student_id,
          'displayName', p.display_name,
          'joinedAt', e.joined_at
        )
        order by p.display_name, e.student_id
      )
      from public.enrollments e
      join public.profiles p on p.id = e.student_id
      where e.classroom_id = cid
    ), '[]'::jsonb),
    'activity',
    coalesce((
      select jsonb_agg(row_json order by started_at, problem_id, student_id)
      from (
        select
          a.started_at,
          a.problem_id,
          a.student_id,
          jsonb_strip_nulls(jsonb_build_object(
            'studentId', a.student_id,
            'problemId', a.problem_id,
            'startedAt', a.started_at,
            'hintViews', coalesce((
              select jsonb_agg(
                jsonb_build_object('ordinal', hv.ordinal, 'viewedAt', hv.viewed_at)
                order by hv.ordinal, hv.viewed_at
              )
              from private.hint_views hv
              where hv.problem_id = a.problem_id and hv.student_id = a.student_id
            ), '[]'::jsonb),
            'reportedAt', r.reported_at,
            'verification', r.verification,
            'evidence', r.evidence,
            'review', private.review_json(a.problem_id, a.student_id)
          )) as row_json
        from public.attempts a
        join public.problems pr on pr.id = a.problem_id
        left join public.progress_reports r
          on r.problem_id = a.problem_id and r.student_id = a.student_id
        where pr.classroom_id = cid
          and exists(
            select 1
            from public.enrollments e
            where e.classroom_id = cid and e.student_id = a.student_id
          )
      ) rows
    ), '[]'::jsonb)
  );
end; $$;

revoke execute on function public.review_progress(uuid,uuid,text,text), public.rotate_invite(uuid) from public, anon;
grant execute on function public.review_progress(uuid,uuid,text,text), public.rotate_invite(uuid) to authenticated;

commit;
