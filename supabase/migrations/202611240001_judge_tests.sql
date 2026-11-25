-- Judge test cases live on the server. Only the judge-submit Edge Function (service role)
-- reads them, and only after checking that the requester may run the problem.
begin;

create table private.problem_tests (
  problem_id uuid not null references public.problems(id) on delete cascade,
  ordinal integer not null check (ordinal between 1 and 20),
  stdin text not null check (length(stdin) <= 20000),
  expected_output text not null check (length(expected_output) <= 20000),
  is_example boolean not null default false,
  primary key (problem_id, ordinal)
);
create table private.base_problem_template_tests (
  template_key text not null references private.base_problem_templates(key) on delete cascade,
  ordinal integer not null check (ordinal between 1 and 20),
  stdin text not null,
  expected_output text not null,
  is_example boolean not null default false,
  primary key (template_key, ordinal)
);
alter table private.problem_tests enable row level security;
alter table private.base_problem_template_tests enable row level security;
revoke all on private.problem_tests, private.base_problem_template_tests from public, anon, authenticated;

-- Copies a template's cases into an imported problem; existing cases are kept.
create function private.copy_template_tests(tkey text, pid uuid) returns void language sql security definer set search_path = '' as $$
  insert into private.problem_tests(problem_id,ordinal,stdin,expected_output,is_example)
  select pid,t.ordinal,t.stdin,t.expected_output,t.is_example
    from private.base_problem_template_tests t where t.template_key = tkey
  on conflict (problem_id,ordinal) do nothing;
$$;
revoke execute on function private.copy_template_tests(text,uuid) from public, anon, authenticated;

-- Same contract as before; imported problems now carry the template's test cases.
create or replace function public.import_base_trail(cid uuid) returns integer language plpgsql security definer set search_path = '' as $$
declare template private.base_problem_templates; pid uuid; imported integer := 0;
begin
  if not coalesce(private.owns_class(cid),false) then raise exception 'owner_required' using errcode = '42501'; end if;
  for template in select * from private.base_problem_templates order by key loop
    if not exists(select 1 from private.classroom_base_imports where classroom_id=cid and template_key=template.key) then
      insert into public.problems(
        classroom_id,module_id,title,difficulty,minutes,objective,statement,input_spec,output_spec,
        constraints_spec,example_input,example_output,external_url,published
      ) values (
        cid,template.module_id,template.title,template.difficulty,template.minutes,template.objective,
        template.statement,template.input_spec,template.output_spec,template.constraints_spec,
        template.example_input,template.example_output,template.external_url,false
      ) returning id into pid;
      perform public.set_problem_hints(pid,template.hints);
      perform private.copy_template_tests(template.key,pid);
      update public.problems set published=true where id=pid;
      insert into private.classroom_base_imports(classroom_id,template_key,problem_id) values(cid,template.key,pid);
      imported := imported + 1;
    end if;
  end loop;
  return imported;
end; $$;

-- Cases for one run. The owner may run drafts (to validate a reference solution); students
-- only published problems of a class they joined. Without stored cases, the public example
-- is the only case.
create function public.judge_cases(pid uuid, requester uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare problem public.problems;
begin
  select * into problem from public.problems where id = pid;
  if problem.id is null or requester is null or not (
    exists(select 1 from public.classrooms c where c.id = problem.classroom_id and c.owner_id = requester)
    or (problem.published and exists(
      select 1 from public.enrollments e where e.classroom_id = problem.classroom_id and e.student_id = requester))
  ) then raise exception 'problem_not_accessible' using errcode = '42501'; end if;
  return coalesce(
    (select jsonb_agg(jsonb_build_object(
       'stdin',t.stdin,'expectedOutput',t.expected_output,'isExample',t.is_example) order by t.ordinal)
     from private.problem_tests t where t.problem_id = pid),
    jsonb_build_array(jsonb_build_object(
      'stdin',problem.example_input,'expectedOutput',problem.example_output,'isExample',true))
  );
end; $$;
revoke execute on function public.judge_cases(uuid,uuid) from public, anon, authenticated;
grant execute on function public.judge_cases(uuid,uuid) to service_role;

commit;
