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
end; $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.test_assert((select count(*) from public.attempts)=1,'owner reads class attempts');
select public.test_assert((select count(*) from public.progress_reports)=1,'owner reads class reports');
reset role;
select public.test_assert((select count(*) from private.hint_views)=1,'hint view recorded once');
select 'Database assertions passed' as result;
