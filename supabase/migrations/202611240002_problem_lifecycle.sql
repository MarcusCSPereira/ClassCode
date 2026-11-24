-- Problem lifecycle for the teacher: drafts with hidden test cases, editing, publishing and
-- archiving. Students only ever see published problems; archiving unpublishes.
begin;

alter table public.problems
  add column archived_at timestamptz,
  add column updated_at timestamptz not null default now();

create function private.problem_status(problem public.problems) returns text language sql immutable set search_path = '' as $$
  select case when problem.archived_at is not null then 'archived' when problem.published then 'published' else 'draft' end;
$$;

-- Creates a draft (no id) or updates an owned problem without changing its status.
-- The statement's example is always case 1; `tests` holds up to 19 hidden cases.
create function public.save_problem(payload jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare pid uuid; cid uuid; existing_class uuid; difficulty_value text; hint_values text[];
begin
  if jsonb_typeof(payload) <> 'object' or jsonb_typeof(payload->'hints') <> 'array'
     or jsonb_typeof(coalesce(payload->'tests','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(payload->'tests','[]'::jsonb)) > 19
    then raise exception 'invalid_problem'; end if;
  pid := nullif(payload->>'id','')::uuid;
  cid := nullif(payload->>'authorClassId','')::uuid;
  if pid is not null then
    select classroom_id into existing_class from public.problems where id = pid;
    if not coalesce(private.owns_class(existing_class),false) then raise exception 'owner_required' using errcode = '42501'; end if;
    if cid is distinct from existing_class then raise exception 'invalid_problem'; end if;
  elsif not coalesce(private.owns_class(cid),false) then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  difficulty_value := case payload->>'difficulty'
    when 'Básico' then 'basic' when 'Intermediário' then 'intermediate' when 'Avançado' then 'advanced' else null end;
  select array_agg(value->>'text' order by ordinality) into hint_values
    from jsonb_array_elements(payload->'hints') with ordinality hints(value,ordinality);
  if difficulty_value is null
     or coalesce(jsonb_array_length(payload->'hints'),0) <> 3
     or exists(select 1 from unnest(hint_values) h where nullif(trim(h),'') is null)
     or nullif(trim(payload->>'title'),'') is null
     or nullif(trim(payload->>'objective'),'') is null
     or nullif(trim(payload->>'statement'),'') is null
     or nullif(trim(payload->>'input'),'') is null
     or nullif(trim(payload->>'output'),'') is null
     or nullif(trim(payload->>'constraints'),'') is null
     or nullif(trim(payload->>'exampleInput'),'') is null
     or nullif(trim(payload->>'exampleOutput'),'') is null
     or exists(select 1 from jsonb_array_elements(coalesce(payload->'tests','[]'::jsonb)) t
       where jsonb_typeof(t) <> 'object' or jsonb_typeof(t->'stdin') <> 'string'
          or nullif(trim(t->>'expectedOutput'),'') is null)
  then raise exception 'invalid_problem'; end if;

  if pid is null then
    insert into public.problems(
      classroom_id,module_id,title,difficulty,minutes,objective,statement,input_spec,output_spec,
      constraints_spec,example_input,example_output,external_url,published
    ) values (
      cid,payload->>'moduleId',trim(payload->>'title'),difficulty_value,(payload->>'minutes')::integer,
      trim(payload->>'objective'),trim(payload->>'statement'),trim(payload->>'input'),trim(payload->>'output'),
      trim(payload->>'constraints'),payload->>'exampleInput',payload->>'exampleOutput',
      nullif(trim(payload->>'externalUrl'),''),false
    ) returning id into pid;
  else
    update public.problems set
      module_id=payload->>'moduleId',title=trim(payload->>'title'),difficulty=difficulty_value,
      minutes=(payload->>'minutes')::integer,objective=trim(payload->>'objective'),
      statement=trim(payload->>'statement'),input_spec=trim(payload->>'input'),
      output_spec=trim(payload->>'output'),constraints_spec=trim(payload->>'constraints'),
      example_input=payload->>'exampleInput',example_output=payload->>'exampleOutput',
      external_url=nullif(trim(payload->>'externalUrl'),''),updated_at=now()
    where id = pid;
  end if;
  perform public.set_problem_hints(pid,hint_values);
  delete from private.problem_tests where problem_id = pid;
  insert into private.problem_tests(problem_id,ordinal,stdin,expected_output,is_example)
    values (pid,1,payload->>'exampleInput',payload->>'exampleOutput',true);
  insert into private.problem_tests(problem_id,ordinal,stdin,expected_output,is_example)
    select pid,(item.ordinality + 1)::integer,item.value->>'stdin',item.value->>'expectedOutput',false
      from jsonb_array_elements(coalesce(payload->'tests','[]'::jsonb)) with ordinality item(value,ordinality);
  return pid;
exception when check_violation or foreign_key_violation or not_null_violation
  or invalid_text_representation or numeric_value_out_of_range then
  raise exception 'invalid_problem';
end; $$;

-- draft: hidden from students; published: visible; archived: hidden and marked, restorable.
create function public.set_problem_status(pid uuid, new_status text) returns void language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  select classroom_id into cid from public.problems where id = pid;
  if not coalesce(private.owns_class(cid),false) then raise exception 'owner_required' using errcode = '42501'; end if;
  case new_status
    when 'draft' then
      update public.problems set published=false, archived_at=null, updated_at=now() where id=pid;
    when 'published' then
      update public.problems set published=true, archived_at=null, updated_at=now() where id=pid;
    when 'archived' then
      update public.problems set published=false, archived_at=coalesce(archived_at,now()), updated_at=now() where id=pid;
    else raise exception 'invalid_problem';
  end case;
end; $$;

-- Everything the owner needs to edit, hidden cases included (without the example, case 1).
create function public.get_problem_for_edit(pid uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare problem public.problems;
begin
  select * into problem from public.problems where id = pid;
  if problem.id is null or not coalesce(private.owns_class(problem.classroom_id),false)
    then raise exception 'owner_required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'id',problem.id,'authorClassId',problem.classroom_id,'moduleId',problem.module_id,'title',problem.title,
    'difficulty',case problem.difficulty when 'basic' then 'Básico' when 'intermediate' then 'Intermediário' else 'Avançado' end,
    'minutes',problem.minutes,'objective',problem.objective,'statement',problem.statement,
    'input',problem.input_spec,'output',problem.output_spec,'constraints',problem.constraints_spec,
    'exampleInput',problem.example_input,'exampleOutput',problem.example_output,
    'externalUrl',problem.external_url,'status',private.problem_status(problem),
    'hints',coalesce((select jsonb_agg(jsonb_build_object('afterSeconds',h.after_seconds,'text',h.content) order by h.ordinal)
      from private.problem_hints h where h.problem_id = pid),'[]'::jsonb),
    'tests',coalesce((select jsonb_agg(jsonb_build_object('stdin',t.stdin,'expectedOutput',t.expected_output) order by t.ordinal)
      from private.problem_tests t where t.problem_id = pid and not t.is_example),'[]'::jsonb),
    'attempts',(select count(*) from public.attempts a where a.problem_id = pid)
  );
end; $$;

-- Owners also list their drafts and archived problems; everyone else, only published ones.
create or replace function public.list_problems() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',pr.id,'moduleId',pr.module_id,'title',pr.title,
      'difficulty',case pr.difficulty when 'basic' then 'Básico' when 'intermediate' then 'Intermediário' else 'Avançado' end,
      'minutes',pr.minutes,'objective',pr.objective,'statement',pr.statement,
      'input',pr.input_spec,'output',pr.output_spec,'constraints',pr.constraints_spec,
      'exampleInput',pr.example_input,'exampleOutput',pr.example_output,
      'externalUrl',pr.external_url,'source','Questão da turma · ' || owner.display_name,
      'authorClassId',pr.classroom_id,'status',private.problem_status(pr),
      'hints',jsonb_build_array(
        jsonb_build_object('afterSeconds',180),
        jsonb_build_object('afterSeconds',420),
        jsonb_build_object('afterSeconds',720)
      )
    ) order by pr.created_at,pr.id)
    from public.problems pr
    join public.classrooms c on c.id=pr.classroom_id
    join public.profiles owner on owner.id=c.owner_id
    where (pr.published and private.can_read_class(pr.classroom_id)) or c.owner_id = auth.uid()
  ), '[]'::jsonb);
end; $$;

revoke execute on function private.problem_status(public.problems) from public, anon, authenticated;
revoke execute on function public.save_problem(jsonb), public.set_problem_status(uuid,text),
  public.get_problem_for_edit(uuid) from public, anon;
grant execute on function public.save_problem(jsonb), public.set_problem_status(uuid,text),
  public.get_problem_for_edit(uuid) to authenticated;

commit;
