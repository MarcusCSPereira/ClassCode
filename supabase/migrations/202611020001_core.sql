-- Backend foundation; not connected to the browser demo.
-- Target: a fresh Supabase project (auth.users and auth.uid() supplied by Supabase).
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 100),
  role text not null default 'student' check (role in ('student', 'teacher'))
);
create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null check (length(name) between 1 and 100),
  term text not null check (length(term) between 1 and 20),
  created_at timestamptz not null default now()
);
create table private.class_invites (
  classroom_id uuid primary key references public.classrooms(id) on delete cascade,
  code text unique not null default replace(gen_random_uuid()::text, '-', '')
);
create table public.enrollments (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (classroom_id, student_id)
);
create index enrollments_student on public.enrollments(student_id);
create table public.modules (
  id text primary key,
  title text not null,
  position integer unique not null,
  prerequisites text[] not null default '{}'
);
create table public.problems (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  module_id text not null references public.modules(id),
  title text not null check (length(title) between 1 and 100),
  difficulty text not null check (difficulty in ('basic','intermediate','advanced')),
  minutes integer not null check (minutes between 5 and 180),
  objective text not null check (length(objective) > 0),
  statement text not null check (length(statement) > 0),
  input_spec text not null check (length(input_spec) > 0),
  output_spec text not null check (length(output_spec) > 0),
  constraints_spec text not null check (length(constraints_spec) > 0),
  example_input text not null check (length(example_input) > 0),
  example_output text not null check (length(example_output) > 0),
  external_url text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index problems_classroom on public.problems(classroom_id);
create table private.problem_hints (
  problem_id uuid not null references public.problems(id) on delete cascade,
  ordinal integer not null check (ordinal between 1 and 3),
  after_seconds integer not null,
  content text not null check (length(content) between 1 and 4000),
  check (after_seconds = case ordinal when 1 then 180 when 2 then 420 else 720 end),
  primary key (problem_id, ordinal)
);
create table public.attempts (
  problem_id uuid not null references public.problems(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (problem_id, student_id)
);
create table private.hint_views (
  problem_id uuid not null,
  student_id uuid not null,
  ordinal integer not null,
  viewed_at timestamptz not null default now(),
  primary key (problem_id, student_id, ordinal),
  foreign key (problem_id, student_id) references public.attempts(problem_id, student_id) on delete cascade,
  foreign key (problem_id, ordinal) references private.problem_hints(problem_id, ordinal) on delete cascade
);
create table public.progress_reports (
  problem_id uuid not null,
  student_id uuid not null,
  evidence text not null check (length(evidence) between 1 and 2000),
  reported_at timestamptz not null default now(),
  verification text not null default 'self_reported' check (verification = 'self_reported'),
  primary key (problem_id, student_id),
  foreign key (problem_id, student_id) references public.attempts(problem_id, student_id) on delete cascade
);

-- SECURITY DEFINER helpers avoid recursive RLS; inputs cannot choose the acting user.
create function private.owns_class(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.classrooms where id = cid and owner_id = auth.uid());
$$;
create function private.can_read_class(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.owns_class(cid) or exists(select 1 from public.enrollments where classroom_id = cid and student_id = auth.uid());
$$;
create function private.can_practice(pid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.problems p where p.id = pid and p.published and private.can_read_class(p.classroom_id));
$$;
create function private.is_teacher() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;

create function private.new_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, role) values (new.id, coalesce(nullif(left(new.raw_user_meta_data->>'display_name',100),''),'Estudante'), 'student');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.new_profile();

create function public.create_classroom(class_name text, class_term text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare cid uuid; invite text;
begin
  if not private.is_teacher() then raise exception 'teacher_required' using errcode = '42501'; end if;
  insert into public.classrooms(owner_id,name,term) values(auth.uid(),trim(class_name),trim(class_term)) returning id into cid;
  insert into private.class_invites(classroom_id) values(cid) returning code into invite;
  return jsonb_build_object('id',cid,'code',invite);
end; $$;
create function public.join_classroom(invite_code text) returns uuid language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select classroom_id into cid from private.class_invites where code = lower(trim(invite_code));
  if cid is null then raise exception 'invalid_invite'; end if;
  insert into public.enrollments(classroom_id,student_id) values(cid,auth.uid()) on conflict do nothing;
  return cid;
end; $$;
create function public.start_attempt(pid uuid) returns timestamptz language plpgsql security definer set search_path = '' as $$
declare started timestamptz;
begin
  if not private.can_practice(pid) then raise exception 'problem_not_accessible' using errcode = '42501'; end if;
  insert into public.attempts(problem_id,student_id) values(pid,auth.uid()) on conflict do nothing;
  select started_at into started from public.attempts where problem_id = pid and student_id = auth.uid();
  return started;
end; $$;
create function public.set_problem_hints(pid uuid, hints text[]) returns void language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  select classroom_id into cid from public.problems where id = pid;
  if not coalesce(private.owns_class(cid),false) then raise exception 'owner_required' using errcode = '42501'; end if;
  if coalesce(cardinality(hints),0) <> 3 or array_position(hints,null) is not null then raise exception 'three_hints_required'; end if;
  insert into private.problem_hints(problem_id,ordinal,after_seconds,content)
    select pid, n, case n when 1 then 180 when 2 then 420 else 720 end, trim(hints[n]) from generate_series(1,3) n
    on conflict (problem_id,ordinal) do update set content = excluded.content;
end; $$;
create function public.get_hint(pid uuid, hint_number integer) returns text language plpgsql security definer set search_path = '' as $$
declare started timestamptz; hint private.problem_hints;
begin
  if not private.can_practice(pid) then raise exception 'problem_not_accessible' using errcode = '42501'; end if;
  select started_at into started from public.attempts where problem_id = pid and student_id = auth.uid();
  select * into hint from private.problem_hints where problem_id = pid and ordinal = hint_number;
  if started is null or hint.content is null or now() < started + make_interval(secs => hint.after_seconds) then raise exception 'hint_locked' using errcode = '42501'; end if;
  insert into private.hint_views(problem_id,student_id,ordinal) values(pid,auth.uid(),hint_number) on conflict do nothing;
  return hint.content;
end; $$;

-- Publishing requires all three hints. Problem creation and hint configuration remain drafts.
create function private.validate_publication() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.published and (select count(*) from private.problem_hints where problem_id = new.id) <> 3 then raise exception 'three_hints_required_before_publication'; end if;
  return new;
end; $$;
create trigger require_hints before insert or update on public.problems for each row execute function private.validate_publication();

alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.enrollments enable row level security;
alter table public.modules enable row level security;
alter table public.problems enable row level security;
alter table public.attempts enable row level security;
alter table public.progress_reports enable row level security;
alter table private.class_invites enable row level security;
alter table private.problem_hints enable row level security;
alter table private.hint_views enable row level security;

revoke all on public.profiles, public.classrooms, public.enrollments, public.modules, public.problems, public.attempts, public.progress_reports from anon, authenticated;
grant select on public.profiles, public.classrooms, public.enrollments, public.modules, public.problems, public.attempts, public.progress_reports to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant update(name,term) on public.classrooms to authenticated;
grant insert,update,delete on public.problems to authenticated;
grant insert,update,delete on public.progress_reports to authenticated;

-- Helpers must be callable for RLS, but private is not an exposed PostgREST schema.
grant usage on schema private to authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.owns_class(uuid), private.can_read_class(uuid), private.can_practice(uuid), private.is_teacher() to authenticated;
revoke execute on function public.create_classroom(text,text), public.join_classroom(text), public.start_attempt(uuid), public.set_problem_hints(uuid,text[]), public.get_hint(uuid,integer) from public, anon;
grant execute on function public.create_classroom(text,text), public.join_classroom(text), public.start_attempt(uuid), public.set_problem_hints(uuid,text[]), public.get_hint(uuid,integer) to authenticated;

create policy profile_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profile_self_name on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy classroom_read on public.classrooms for select to authenticated using (private.can_read_class(id));
create policy classroom_owner_update on public.classrooms for update to authenticated using (private.owns_class(id)) with check (private.owns_class(id));
create policy enrollment_read on public.enrollments for select to authenticated using (student_id = (select auth.uid()) or private.owns_class(classroom_id));
create policy curriculum_read on public.modules for select to authenticated using (true);
create policy problem_read on public.problems for select to authenticated using (private.owns_class(classroom_id) or (published and private.can_read_class(classroom_id)));
create policy problem_owner_insert on public.problems for insert to authenticated with check (private.owns_class(classroom_id));
create policy problem_owner_update on public.problems for update to authenticated using (private.owns_class(classroom_id)) with check (private.owns_class(classroom_id));
create policy problem_owner_delete on public.problems for delete to authenticated using (private.owns_class(classroom_id));
create policy attempt_read on public.attempts for select to authenticated using (student_id = (select auth.uid()) or exists(select 1 from public.problems p where p.id = problem_id and private.owns_class(p.classroom_id)));
create policy report_read on public.progress_reports for select to authenticated using (student_id = (select auth.uid()) or exists(select 1 from public.problems p where p.id = problem_id and private.owns_class(p.classroom_id)));
create policy report_self_insert on public.progress_reports for insert to authenticated with check (student_id = (select auth.uid()) and private.can_practice(problem_id));
create policy report_self_update on public.progress_reports for update to authenticated using (student_id = (select auth.uid()) and private.can_practice(problem_id)) with check (student_id = (select auth.uid()) and private.can_practice(problem_id));
create policy report_self_delete on public.progress_reports for delete to authenticated using (student_id = (select auth.uid()));
commit;
