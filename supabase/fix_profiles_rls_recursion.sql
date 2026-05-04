create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select profiles.role
  from public.profiles
  where profiles.id = auth.uid()
  limit 1;
$$;

drop policy if exists "Operators can read profiles from assigned reports" on public.profiles;
drop policy if exists "Operators can read pending reports for queue" on public.emergency_reports;

create policy "Operators can read pending reports for queue"
on public.emergency_reports
for select
to authenticated
using (public.current_user_role() = 'dispatcher');

grant execute on function public.current_user_role() to authenticated;

notify pgrst, 'reload schema';
