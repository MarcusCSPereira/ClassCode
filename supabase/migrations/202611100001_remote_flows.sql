-- Complete the browser repository contract with server-authoritative RPCs.
begin;

create table private.base_problem_templates (
  key text primary key,
  module_id text not null references public.modules(id),
  title text not null,
  difficulty text not null check (difficulty in ('basic','intermediate','advanced')),
  minutes integer not null check (minutes between 5 and 180),
  objective text not null,
  statement text not null,
  input_spec text not null,
  output_spec text not null,
  constraints_spec text not null,
  example_input text not null,
  example_output text not null,
  external_url text,
  hints text[] not null check (cardinality(hints) = 3)
);
create table private.classroom_base_imports (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  template_key text not null references private.base_problem_templates(key),
  problem_id uuid not null unique references public.problems(id) on delete cascade,
  primary key (classroom_id, template_key)
);
alter table private.base_problem_templates enable row level security;
alter table private.classroom_base_imports enable row level security;
revoke all on private.base_problem_templates, private.classroom_base_imports from public, anon, authenticated;

create function public.my_profile() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select jsonb_build_object('id',p.id,'displayName',p.display_name,'role',p.role)
    into result from public.profiles p where p.id = auth.uid();
  if result is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return result;
end; $$;

create function public.list_classrooms() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',c.id,
      'name',c.name,
      'code',case when c.owner_id = auth.uid() then i.code else '' end,
      'teacher',p.display_name,
      'term',c.term
    ) order by c.created_at,c.id)
    from public.classrooms c
    join public.profiles p on p.id = c.owner_id
    left join private.class_invites i on i.classroom_id = c.id
    where c.owner_id = auth.uid()
       or exists(select 1 from public.enrollments e where e.classroom_id=c.id and e.student_id=auth.uid())
  ), '[]'::jsonb);
end; $$;

create function public.list_problems() returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
      'authorClassId',pr.classroom_id,
      'hints',jsonb_build_array(
        jsonb_build_object('afterSeconds',180),
        jsonb_build_object('afterSeconds',420),
        jsonb_build_object('afterSeconds',720)
      )
    ) order by pr.created_at,pr.id)
    from public.problems pr
    join public.classrooms c on c.id=pr.classroom_id
    join public.profiles owner on owner.id=c.owner_id
    where pr.published and private.can_read_class(pr.classroom_id)
  ), '[]'::jsonb);
end; $$;

create function public.publish_problem(payload jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare pid uuid; cid uuid; difficulty_value text; hint_values text[];
begin
  cid := nullif(payload->>'authorClassId','')::uuid;
  if not coalesce(private.owns_class(cid),false) then raise exception 'owner_required' using errcode = '42501'; end if;
  if jsonb_typeof(payload) <> 'object' or jsonb_typeof(payload->'hints') <> 'array'
    then raise exception 'invalid_problem'; end if;
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
  then raise exception 'invalid_problem'; end if;
  insert into public.problems(
    classroom_id,module_id,title,difficulty,minutes,objective,statement,input_spec,output_spec,
    constraints_spec,example_input,example_output,external_url,published
  ) values (
    cid,payload->>'moduleId',trim(payload->>'title'),difficulty_value,(payload->>'minutes')::integer,
    trim(payload->>'objective'),trim(payload->>'statement'),trim(payload->>'input'),trim(payload->>'output'),
    trim(payload->>'constraints'),payload->>'exampleInput',payload->>'exampleOutput',nullif(trim(payload->>'externalUrl'),''),false
  ) returning id into pid;
  perform public.set_problem_hints(pid,hint_values);
  update public.problems set published=true where id=pid;
  return pid;
exception when check_violation or foreign_key_violation or not_null_violation or invalid_text_representation then
  raise exception 'invalid_problem';
end; $$;

create function public.report_progress(pid uuid, report_evidence text) returns void language plpgsql security definer set search_path = '' as $$
declare clean text := trim(report_evidence);
begin
  if not private.can_practice(pid) then raise exception 'problem_not_accessible' using errcode = '42501'; end if;
  if not exists(select 1 from public.attempts where problem_id=pid and student_id=auth.uid())
    then raise exception 'attempt_required'; end if;
  if clean is null or length(clean) not between 1 and 2000 then raise exception 'invalid_evidence'; end if;
  insert into public.progress_reports(problem_id,student_id,evidence)
    values(pid,auth.uid(),clean)
    on conflict(problem_id,student_id) do update set evidence=excluded.evidence;
end; $$;

create function public.reopen_problem(pid uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  delete from public.progress_reports where problem_id=pid and student_id=auth.uid();
end; $$;

create function public.import_base_trail(cid uuid) returns integer language plpgsql security definer set search_path = '' as $$
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
      update public.problems set published=true where id=pid;
      insert into private.classroom_base_imports(classroom_id,template_key,problem_id) values(cid,template.key,pid);
      imported := imported + 1;
    end if;
  end loop;
  return imported;
end; $$;

revoke execute on function public.my_profile(), public.list_classrooms(), public.list_problems(),
  public.publish_problem(jsonb), public.report_progress(uuid,text), public.reopen_problem(uuid),
  public.import_base_trail(uuid) from public, anon;
grant execute on function public.my_profile(), public.list_classrooms(), public.list_problems(),
  public.publish_problem(jsonb), public.report_progress(uuid,text), public.reopen_problem(uuid),
  public.import_base_trail(uuid) to authenticated;

commit;
