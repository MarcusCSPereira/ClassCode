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
-- Judge cases (202611240001): only the service role reads them, after the access check.
select public.test_assert(not has_function_privilege('authenticated','public.judge_cases(uuid,uuid)','execute'),'students cannot read judge cases');
select public.test_assert(not has_function_privilege('anon','public.judge_cases(uuid,uuid)','execute'),'anonymous cannot read judge cases');
select public.test_assert(has_function_privilege('service_role','public.judge_cases(uuid,uuid)','execute'),'judge function reads cases');
select public.test_assert((select count(*) from private.base_problem_template_tests)=31,'seed has the 31 base trail cases');
select public.test_assert((select count(*) from private.problem_tests t join private.classroom_base_imports i on i.problem_id=t.problem_id where i.classroom_id=:'imported_cid')=31,'imported trail carries all judge cases');
select problem_id as sum_pid from private.classroom_base_imports where classroom_id=:'imported_cid' and template_key='sum' \gset
insert into public.problems(classroom_id,module_id,title,difficulty,minutes,objective,statement,input_spec,output_spec,constraints_spec,example_input,example_output)
values (:'imported_cid','foundations','Rascunho do professor','basic',10,'o','s','i','o','c','5','5') returning id as draft_pid \gset
select set_config('test.sum_pid',:'sum_pid',false), set_config('test.draft_pid',:'draft_pid',false);
set role service_role;
select public.judge_cases(:'sum_pid','00000000-0000-0000-0000-000000000003') as student_cases \gset
select public.test_assert(jsonb_array_length(:'student_cases'::jsonb)=4 and (:'student_cases'::jsonb->0->>'isExample')::boolean,'enrolled student runs hidden cases, example first');
select public.test_assert(jsonb_array_length(public.judge_cases(:'remote_pid','00000000-0000-0000-0000-000000000003'))=1,'problem without stored cases falls back to its example');
select public.test_assert(jsonb_array_length(public.judge_cases(:'draft_pid','00000000-0000-0000-0000-000000000001'))=1,'owner runs cases of a draft');
do $$ begin
  begin perform public.judge_cases(current_setting('test.sum_pid')::uuid,'00000000-0000-0000-0000-000000000002'); raise exception 'student of another class read judge cases'; exception when insufficient_privilege then null; end;
  begin perform public.judge_cases(current_setting('test.sum_pid')::uuid,'00000000-0000-0000-0000-000000000004'); raise exception 'another teacher read judge cases'; exception when insufficient_privilege then null; end;
  begin perform public.judge_cases(current_setting('test.draft_pid')::uuid,'00000000-0000-0000-0000-000000000003'); raise exception 'student ran a draft'; exception when insufficient_privilege then null; end;
  begin perform public.judge_cases(current_setting('test.sum_pid')::uuid,null); raise exception 'anonymous requester read judge cases'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
-- Problem lifecycle (202611240002): drafts with hidden cases, edit, publish, archive, restore.
select set_config('test.imported_cid',:'imported_cid',false), set_config('test.cid',:'cid',false);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.save_problem(jsonb_build_object(
  'authorClassId',:'imported_cid','moduleId','foundations','title','Dobro','difficulty','Básico','minutes',10,
  'objective','Dobrar','statement','Imprima 2n.','input','n','output','2n','constraints','0 ≤ n ≤ 10',
  'exampleInput','2','exampleOutput','4',
  'hints',jsonb_build_array(jsonb_build_object('text','D1'),jsonb_build_object('text','D2'),jsonb_build_object('text','D3')),
  'tests',jsonb_build_array(jsonb_build_object('stdin','5','expectedOutput','10'),jsonb_build_object('stdin','0','expectedOutput','0'))
)) as lifecycle_pid \gset
select set_config('test.lifecycle_pid',:'lifecycle_pid',false);
select public.get_problem_for_edit(:'lifecycle_pid') as edit_payload \gset
select public.test_assert(:'edit_payload'::jsonb->>'status'='draft','new problems start as drafts');
select public.test_assert(jsonb_array_length(:'edit_payload'::jsonb->'tests')=2 and :'edit_payload'::jsonb->'hints'->0->>'text'='D1','owner reads hints and hidden cases to edit');
select public.test_assert(exists(select 1 from jsonb_array_elements(public.list_problems()) p where p->>'id'=:'lifecycle_pid' and p->>'status'='draft'),'owner lists own drafts');
reset role;
select public.test_assert((select count(*) from private.problem_tests where problem_id=:'lifecycle_pid')=3,'example is case 1, then the hidden cases');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.test_assert(not exists(select 1 from jsonb_array_elements(public.list_problems()) p where p->>'id'=:'lifecycle_pid'),'students never list drafts');
do $$ begin
  begin perform public.start_attempt(current_setting('test.lifecycle_pid')::uuid); raise exception 'student opened a draft'; exception when insufficient_privilege then null; end;
  begin perform public.get_problem_for_edit(current_setting('test.lifecycle_pid')::uuid); raise exception 'student read a draft for editing'; exception when insufficient_privilege then null; end;
  begin perform public.set_problem_status(current_setting('test.lifecycle_pid')::uuid,'published'); raise exception 'student published a problem'; exception when insufficient_privilege then null; end;
  begin perform public.save_problem(jsonb_build_object('authorClassId',current_setting('test.imported_cid'),'hints','[]'::jsonb)); raise exception 'student created a problem'; exception when insufficient_privilege then null; end;
end; $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
do $$ begin
  begin perform public.get_problem_for_edit(current_setting('test.lifecycle_pid')::uuid); raise exception 'another teacher read a draft'; exception when insufficient_privilege then null; end;
  begin perform public.save_problem(jsonb_build_object('id',current_setting('test.lifecycle_pid'),'authorClassId',current_setting('test.imported_cid'),'hints','[]'::jsonb)); raise exception 'another teacher edited a problem'; exception when insufficient_privilege then null; end;
  begin perform public.set_problem_status(current_setting('test.lifecycle_pid')::uuid,'archived'); raise exception 'another teacher archived a problem'; exception when insufficient_privilege then null; end;
end; $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.save_problem(:'edit_payload'::jsonb || jsonb_build_object('title','Dobro de n','tests',jsonb_build_array(jsonb_build_object('stdin','5','expectedOutput','10'))))=:'lifecycle_pid'::uuid as same_id \gset
select public.test_assert(:'same_id'::boolean,'editing keeps the problem id');
select public.test_assert(public.get_problem_for_edit(:'lifecycle_pid')->>'title'='Dobro de n' and jsonb_array_length(public.get_problem_for_edit(:'lifecycle_pid')->'tests')=1,'editing saves fields and replaces hidden cases');
do $$
declare base jsonb := public.get_problem_for_edit(current_setting('test.lifecycle_pid')::uuid);
begin
  begin perform public.save_problem(base || jsonb_build_object('authorClassId',current_setting('test.cid'))); raise exception 'problem moved to another class'; exception when others then if sqlerrm <> 'invalid_problem' then raise; end if; end;
  begin perform public.save_problem(base || jsonb_build_object('tests',(select jsonb_agg(jsonb_build_object('stdin','1','expectedOutput','1')) from generate_series(1,20)))); raise exception 'twenty hidden cases accepted'; exception when others then if sqlerrm <> 'invalid_problem' then raise; end if; end;
  begin perform public.save_problem(base || jsonb_build_object('tests',jsonb_build_array(jsonb_build_object('stdin','1','expectedOutput','  ')))); raise exception 'blank expected output accepted'; exception when others then if sqlerrm <> 'invalid_problem' then raise; end if; end;
  begin perform public.save_problem(base || jsonb_build_object('minutes','muito')); raise exception 'non-numeric minutes accepted'; exception when others then if sqlerrm <> 'invalid_problem' then raise; end if; end;
  begin perform public.set_problem_status(current_setting('test.lifecycle_pid')::uuid,'deleted'); raise exception 'unknown status accepted'; exception when others then if sqlerrm <> 'invalid_problem' then raise; end if; end;
end; $$;
select public.set_problem_status(:'lifecycle_pid','published');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.test_assert(exists(select 1 from jsonb_array_elements(public.list_problems()) p where p->>'id'=:'lifecycle_pid' and p->>'status'='published'),'students list published problems');
select public.start_attempt(:'lifecycle_pid') is not null as opened \gset
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.test_assert((public.get_problem_for_edit(:'lifecycle_pid')->>'attempts')::integer=1,'owner sees how many students opened the problem');
select public.set_problem_status(:'lifecycle_pid','archived');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.test_assert(not exists(select 1 from jsonb_array_elements(public.list_problems()) p where p->>'id'=:'lifecycle_pid'),'archived problems leave the student list');
do $$ begin
  begin perform public.start_attempt(current_setting('test.lifecycle_pid')::uuid); raise exception 'student opened an archived problem'; exception when insufficient_privilege then null; end;
end; $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.test_assert(public.get_problem_for_edit(:'lifecycle_pid')->>'status'='archived','owner keeps archived problems');
select public.set_problem_status(:'lifecycle_pid','draft');
select public.test_assert(public.get_problem_for_edit(:'lifecycle_pid')->>'status'='draft','archived problems restore as drafts');
reset role;
-- Teacher review and invite rotation (202611240003).
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.start_attempt(:'sum_pid') is not null as sum_started \gset
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$ begin
  begin perform public.review_progress(current_setting('test.sum_pid')::uuid,'00000000-0000-0000-0000-000000000003'::uuid,'reviewed',null); raise exception 'reviewed without a report'; exception when others then if sqlerrm <> 'report_required' then raise; end if; end;
end; $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.report_progress(:'sum_pid','Somei os dois números.');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.review_progress(:'sum_pid','00000000-0000-0000-0000-000000000003','changes_requested','Teste o caso 0 0.');
select public.test_assert((select value->'review'->>'status' from jsonb_array_elements(public.classroom_activity(:'imported_cid')->'activity') value where value->>'problemId'=:'sum_pid')='changes_requested','teacher sees the review in class activity');
do $$ begin
  begin perform public.review_progress(current_setting('test.sum_pid')::uuid,'00000000-0000-0000-0000-000000000003'::uuid,'changes_requested','  '); raise exception 'change request without comment'; exception when others then if sqlerrm <> 'invalid_review' then raise; end if; end;
  begin perform public.review_progress(current_setting('test.sum_pid')::uuid,'00000000-0000-0000-0000-000000000003'::uuid,'approved',null); raise exception 'unknown review status'; exception when others then if sqlerrm <> 'invalid_review' then raise; end if; end;
end; $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.test_assert((select value->'review'->>'comment' from jsonb_array_elements(public.my_activity()) value where value->>'problemId'=:'sum_pid')='Teste o caso 0 0.','student reads the feedback');
select public.test_assert(not has_table_privilege('authenticated','public.progress_reviews','select'),'reviews are read only through the activity RPCs');
do $$ begin
  begin perform public.review_progress(current_setting('test.sum_pid')::uuid,'00000000-0000-0000-0000-000000000003'::uuid,'reviewed',null); raise exception 'student reviewed own work'; exception when insufficient_privilege then null; end;
  begin perform public.rotate_invite(current_setting('test.imported_cid')::uuid); raise exception 'student rotated an invite'; exception when insufficient_privilege then null; end;
end; $$;
select public.report_progress(:'sum_pid','Somei e testei 0 0.');
select public.test_assert(not ((select value from jsonb_array_elements(public.my_activity()) value where value->>'problemId'=:'sum_pid') ? 'review'),'new evidence clears the review');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
do $$ begin
  begin perform public.review_progress(current_setting('test.sum_pid')::uuid,'00000000-0000-0000-0000-000000000003'::uuid,'reviewed',null); raise exception 'another teacher reviewed'; exception when insufficient_privilege then null; end;
  begin perform public.rotate_invite(current_setting('test.imported_cid')::uuid); raise exception 'another teacher rotated an invite'; exception when insufficient_privilege then null; end;
end; $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.review_progress(:'sum_pid','00000000-0000-0000-0000-000000000003','reviewed',null);
select public.test_assert((select value->'review'->>'status' from jsonb_array_elements(public.classroom_activity(:'imported_cid')->'activity') value where value->>'problemId'=:'sum_pid')='reviewed','teacher marks the completion as reviewed');
select public.review_progress(:'sum_pid','00000000-0000-0000-0000-000000000003','clear',null);
select public.test_assert(not ((select value from jsonb_array_elements(public.classroom_activity(:'imported_cid')->'activity') value where value->>'problemId'=:'sum_pid') ? 'review'),'teacher can undo a review');
select public.review_progress(:'sum_pid','00000000-0000-0000-0000-000000000003','reviewed',null);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.reopen_problem(:'sum_pid');
reset role;
select public.test_assert((select count(*) from public.progress_reviews where problem_id=:'sum_pid')=0,'reopening removes the review');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.rotate_invite(:'imported_cid') as new_code \gset
select public.test_assert(:'new_code' <> :'imported_code','rotation issues a new code');
select set_config('test.old_code',:'imported_code',false);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$ begin
  begin perform public.join_classroom(current_setting('test.old_code')); raise exception 'old invite still works'; exception when others then if sqlerrm <> 'invalid_invite' then raise; end if; end;
end; $$;
select public.test_assert(public.join_classroom(:'new_code')=:'imported_cid'::uuid,'the new invite works');
reset role;
select 'Database assertions passed' as result;
