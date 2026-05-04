create extension if not exists pgcrypto;

create or replace function public.generate_user_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := lpad(floor(random() * 10000000)::text, 7, '0');
    exit when not exists (
      select 1 from public.profiles where profiles.user_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

alter table public.profiles add column if not exists user_code text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists is_available boolean not null default true;
alter table public.profiles add column if not exists last_active_at timestamptz;

update public.profiles
set user_code = public.generate_user_code()
where user_code is null or user_code = '';

alter table public.profiles alter column user_code set default public.generate_user_code();
alter table public.profiles alter column user_code set not null;

create unique index if not exists profiles_user_code_unique
on public.profiles (user_code);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_role text;
begin
  safe_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'reporter');

  if safe_role not in ('reporter', 'dispatcher') then
    safe_role := 'reporter';
  end if;

  insert into public.profiles (
    id,
    user_code,
    email,
    full_name,
    role,
    phone,
    address,
    avatar_url
  )
  values (
    new.id,
    public.generate_user_code(),
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    safe_role,
    '',
    new.raw_user_meta_data ->> 'address',
    ''
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role = excluded.role,
    address = coalesce(excluded.address, profiles.address),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

grant execute on function public.generate_user_code() to authenticated;

notify pgrst, 'reload schema';
