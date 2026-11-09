begin;

create function public.my_activity() returns jsonb language plpgsql security definer set search_path = '' as $$
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
          'evidence', r.evidence
        )) as row_json
      from public.attempts a
      left join public.progress_reports r
        on r.problem_id = a.problem_id and r.student_id = a.student_id
      where a.student_id = uid
    ) rows
  ), '[]'::jsonb);
end; $$;

create function public.classroom_activity(cid uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
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
            'evidence', r.evidence
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

revoke execute on function public.my_activity(), public.classroom_activity(uuid) from public, anon;
grant execute on function public.my_activity(), public.classroom_activity(uuid) to authenticated;

commit;
