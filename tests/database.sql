\set ON_ERROR_STOP on
create function public.test_assert(ok boolean, message text) returns void language plpgsql as $$ begin if not coalesce(ok,false) then raise exception 'ASSERTION FAILED: %',message; end if; end; $$;
insert into auth.users(id) values
('00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000002'),
('00000000-0000-0000-0000-000000000003'),
('00000000-0000-0000-0000-000000000004');
update public.profiles set role='teacher' where id in ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select result->>'id' as cid, result->>'code' as code from (select public.create_classroom('Algoritmos','2026.2') result) q \gset
insert into public.problems(classroom_id,module_id,title,difficulty,minutes,objective,statement,input_spec,output_spec,constraints_spec,example_input,example_output)
values (:'cid','foundations','Soma','basic',10,'Somar','Some a e b','a b','a+b','0 ≤ a,b ≤ 10','2 3','5') returning id as pid \gset
select public.set_problem_hints(:'pid',array['Uma direção','Uma estratégia','Pseudocódigo']);
update public.problems set published=true where id=:'pid';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.test_assert((select count(*) from public.classrooms)=0,'outsider classroom hidden');
select public.test_assert((select count(*) from public.problems)=0,'outsider problems hidden');
select public.test_assert(not has_table_privilege('authenticated','private.problem_hints','select'),'hint table has no read grant');
select public.test_assert(not has_column_privilege('authenticated','public.profiles','role','update'),'no role escalation grant');
select public.test_assert(not has_table_privilege('authenticated','public.attempts','insert'),'attempt timestamp cannot be forged');
select public.test_assert(not has_function_privilege('anon','public.get_hint(uuid,integer)','execute'),'anonymous hint access denied');
select public.test_assert(not has_function_privilege('anon','public.my_activity()','execute'),'anonymous my_activity denied');
select public.test_assert(not has_function_privilege('anon','public.classroom_activity(uuid)','execute'),'anonymous classroom activity denied');
select public.test_assert(not has_function_privilege('anon','public.my_profile()','execute'),'anonymous profile access denied');
select public.test_assert(not has_function_privilege('anon','public.list_classrooms()','execute'),'anonymous classroom list denied');
select public.test_assert(not has_function_privilege('anon','public.list_problems()','execute'),'anonymous problem list denied');
select public.test_assert(not has_function_privilege('anon','public.import_base_trail(uuid)','execute'),'anonymous base import denied');
do $$ begin
  begin perform public.create_classroom('Invalid','2026.2'); raise exception 'student created classroom'; exception when insufficient_privilege then null; end;
end; $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
select public.test_assert((select count(*) from public.problems)=0,'other teacher cannot read problems');
with updated as (update public.problems set title='Hijacked' returning id) select public.test_assert((select count(*) from updated)=0,'other teacher cannot update');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select public.join_classroom(upper(:'code'));
select public.join_classroom(:'code');
select public.test_assert((select count(*) from public.enrollments)=1,'joining twice is idempotent');
select public.test_assert((select count(*) from public.problems)=1,'member reads published problem');
select public.start_attempt(:'pid') as first_start \gset
select public.test_assert(public.start_attempt(:'pid')=:'first_start'::timestamptz,'attempt start cannot be reset');
select set_config('test.pid',:'pid',false);
select set_config('test.cid',:'cid',false);
do $$ begin
  begin perform public.get_hint(current_setting('test.pid')::uuid,1); raise exception 'early hint leaked'; exception when insufficient_privilege then null; end;
  begin update public.profiles set role='teacher'; raise exception 'role escalated'; exception when insufficient_privilege then null; end;
end; $$;
insert into public.progress_reports(problem_id,student_id,evidence) values(:'pid',auth.uid(),'Conferido com o professor.');
select public.test_assert((select verification from public.progress_reports)='self_reported','self report never accepted verdict');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.test_assert((select count(*) from public.attempts)=0,'outsider cannot read attempts');
select public.test_assert((select count(*) from public.progress_reports)=0,'outsider cannot read reports');
reset role;
update public.attempts set started_at=now()-interval '181 seconds';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select public.test_assert(public.get_hint(:'pid',1)='Uma direção','hint 1 unlocks at 180 seconds');
do $$ begin
  begin perform public.get_hint(current_setting('test.pid')::uuid,2); raise exception 'hint 2 leaked early'; exception when insufficient_privilege then null; end;
  begin perform public.classroom_activity(current_setting('test.cid')::uuid); raise exception 'student read classroom activity'; exception when insufficient_privilege then null; end;
end; $$;
select public.my_activity() as my_activity \gset
select public.test_assert(jsonb_array_length(:'my_activity'::jsonb)=1,'my_activity returns one own attempt');
select public.test_assert((:'my_activity'::jsonb->0->>'studentId')='00000000-0000-0000-0000-000000000002','my_activity keeps current student only');
select public.test_assert((:'my_activity'::jsonb->0->>'problemId')=:'pid','my_activity returns the attempted problem');
select public.test_assert((:'my_activity'::jsonb->0->'hintViews'->0->>'ordinal')='1','my_activity includes revealed hints');
select public.test_assert((:'my_activity'::jsonb->0->>'verification')='self_reported','my_activity includes self report verification');
select public.test_assert((:'my_activity'::jsonb->0->>'evidence')='Conferido com o professor.','my_activity includes reported evidence');
select public.report_progress(:'pid','Evidência atualizada pela RPC.');
select public.my_activity() as updated_activity \gset
select public.test_assert((:'updated_activity'::jsonb->0->>'evidence')='Evidência atualizada pela RPC.','report_progress updates evidence');
select public.reopen_problem(:'pid');
select public.my_activity() as reopened_activity \gset
select public.test_assert((:'reopened_activity'::jsonb->0->>'reportedAt') is null,'reopen_problem removes the report');
select public.report_progress(:'pid','Conferido com o professor.');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
do $$ begin
  begin perform public.classroom_activity(current_setting('test.cid')::uuid); raise exception 'other teacher read classroom activity'; exception when insufficient_privilege then null; end;
end; $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
do $$ begin
  begin perform public.classroom_activity(current_setting('test.cid')::uuid); raise exception 'outsider read classroom activity'; exception when insufficient_privilege then null; end;
end; $$;
select public.test_assert(jsonb_array_length(public.my_activity())=0,'my_activity never returns another student');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.test_assert((select count(*) from public.attempts)=1,'owner reads class attempts');
select public.test_assert((select count(*) from public.progress_reports)=1,'owner reads class reports');
select public.classroom_activity(:'cid'::uuid) as classroom_activity \gset
select public.test_assert(jsonb_array_length(:'classroom_activity'::jsonb->'roster')=1,'classroom activity returns roster');
select public.test_assert(jsonb_array_length(:'classroom_activity'::jsonb->'activity')=1,'classroom activity returns attempts');
select public.test_assert((:'classroom_activity'::jsonb->'roster'->0->>'studentId')='00000000-0000-0000-0000-000000000002','classroom activity roster includes enrolled student');
select public.test_assert((:'classroom_activity'::jsonb->'activity'->0->>'studentId')='00000000-0000-0000-0000-000000000002','classroom activity keeps student attribution');
select public.test_assert((:'classroom_activity'::jsonb->'activity'->0->>'verification')='self_reported','classroom activity includes verification');
reset role;
select public.test_assert((select count(*) from private.hint_views)=1,'hint view recorded once');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.my_profile() as teacher_profile \gset
select public.test_assert((:'teacher_profile'::jsonb->>'role')='teacher','my_profile returns the server role');
select result->>'id' as imported_cid, result->>'code' as imported_code
  from (select public.create_classroom('Trilha remota','2026.2') result) q \gset
select public.test_assert(public.import_base_trail(:'imported_cid'::uuid)=7,'base trail imports seven problems');
select public.test_assert(public.import_base_trail(:'imported_cid'::uuid)=0,'base trail import is idempotent');
select public.list_classrooms() as teacher_classrooms \gset
select public.test_assert(jsonb_array_length(:'teacher_classrooms'::jsonb)=2,'teacher lists owned classrooms');
reset role;
select public.test_assert((select count(*) from private.classroom_base_imports where classroom_id=:'imported_cid')=7,'base import mapping is complete');
set role authenticated;
select public.list_problems() as teacher_problems \gset
select public.test_assert(jsonb_array_length(:'teacher_problems'::jsonb)=8,'teacher lists published problems without hint text');
select public.test_assert(not (:'teacher_problems'::jsonb->0->'hints'->0 ? 'text'),'problem list never exposes hint content');
do $$ begin
  begin
    perform public.publish_problem(jsonb_build_object(
      'authorClassId',(select id from public.classrooms where name='Trilha remota'),
      'hints','invalid'
    ));
    raise exception 'malformed problem accepted';
  exception when others then
    if sqlerrm <> 'invalid_problem' then raise; end if;
  end;
end; $$;
select public.publish_problem(jsonb_build_object(
  'authorClassId',:'imported_cid','moduleId','foundations','title','Questão remota',
  'difficulty','Básico','minutes',10,'objective','Testar publicação','statement','Resolva.',
  'input','n','output','n','constraints','0 ≤ n ≤ 10','exampleInput','1','exampleOutput','1',
  'hints',jsonb_build_array(jsonb_build_object('text','D1'),jsonb_build_object('text','D2'),jsonb_build_object('text','D3'))
)) as remote_pid \gset
select public.test_assert((select published from public.problems where id=:'remote_pid'),'publish_problem completes the draft transaction');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.join_classroom(:'imported_code');
select public.list_classrooms() as student_classrooms \gset
select public.test_assert((select value->>'code' from jsonb_array_elements(:'student_classrooms'::jsonb) value where value->>'id'=:'imported_cid')='','student never receives invite code');
select public.list_problems() as student_problems \gset
select public.test_assert(jsonb_array_length(:'student_problems'::jsonb)=8,'student lists only problems from joined classroom');
reset role;
select 'Database assertions passed' as result;
