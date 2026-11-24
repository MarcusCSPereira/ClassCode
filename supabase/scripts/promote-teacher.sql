-- OPERATOR ONLY. Grants or revokes the teacher role by e-mail.
-- Run in the Supabase SQL Editor (project owner). Never expose this as an endpoint or put
-- the service role key in the browser. The account must already exist (sign-up in the app).
--
-- 1. Replace the e-mail below with the teacher's institutional address.
-- 2. Run the block. It returns the affected profile; zero rows means the e-mail has no account.

update public.profiles p
   set role = 'teacher'
  from auth.users u
 where u.id = p.id
   and lower(u.email) = lower('professor@exemplo.edu.br')
returning p.id, p.display_name, p.role;

-- To revoke, run the same statement with role = 'student'. Classes the teacher owns stay
-- owned; reassigning them is a separate, manual decision.
