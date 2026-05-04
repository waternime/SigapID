create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text not null check (role in ('reporter', 'dispatcher')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists user_code text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists is_available boolean not null default true;
alter table public.profiles add column if not exists last_active_at timestamptz;

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

update public.profiles
set user_code = public.generate_user_code()
where user_code is null or user_code = '';

alter table public.profiles alter column user_code set default public.generate_user_code();
alter table public.profiles alter column user_code set not null;

create unique index if not exists profiles_user_code_unique
on public.profiles (user_code);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  relationship_label text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint family_members_not_self check (owner_id <> member_id),
  constraint family_members_unique_pair unique (owner_id, member_id)
);

create table if not exists public.emergency_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  subject_profile_id uuid references public.profiles(id) on delete set null,
  assigned_operator_id uuid references public.profiles(id) on delete set null,
  type text not null check (
    type in (
      'fire',
      'medical',
      'crime',
      'disaster',
      'sos',
      'police',
      'ambulance',
      'firefighter'
    )
  ),
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'assigned',
        'accepted',
        'on_route',
        'arrived',
        'resolved',
        'cancelled',
        'rejected'
      )
    ),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),
  title text,
  description text,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  address text,
  photo_url text,
  call_room text,
  sensor_detected boolean not null default false,
  auto_dispatch_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  dispatched_at timestamptz,
  arrived_at timestamptz,
  resolved_at timestamptz
);

create table if not exists public.operator_assignments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.emergency_reports(id) on delete cascade,
  operator_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'assigned'
    check (status in ('assigned', 'accepted', 'released', 'completed')),
  assigned_by text not null default 'system',
  workload_snapshot integer not null default 0,
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  released_at timestamptz,
  completed_at timestamptz,
  constraint operator_assignments_unique_pair unique (report_id, operator_id)
);

create unique index if not exists operator_assignments_one_active_per_report
on public.operator_assignments (report_id)
where status in ('assigned', 'accepted');

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.emergency_reports(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  kind text not null default 'text'
    check (kind in ('text', 'voice', 'image', 'system')),
  media_url text,
  voice_duration_seconds integer,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_has_content check (
    body is not null or media_url is not null or kind = 'system'
  )
);

create index if not exists family_members_owner_id_idx on public.family_members(owner_id);
create index if not exists family_members_member_id_idx on public.family_members(member_id);
create index if not exists emergency_reports_reporter_id_idx on public.emergency_reports(reporter_id);
create index if not exists emergency_reports_subject_profile_id_idx on public.emergency_reports(subject_profile_id);
create index if not exists emergency_reports_assigned_operator_id_idx on public.emergency_reports(assigned_operator_id);
create index if not exists emergency_reports_status_idx on public.emergency_reports(status);
create index if not exists operator_assignments_operator_id_idx on public.operator_assignments(operator_id);
create index if not exists operator_assignments_report_id_idx on public.operator_assignments(report_id);
create index if not exists messages_report_id_created_at_idx on public.messages(report_id, created_at);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'emergency_reports'
  ) then
    alter publication supabase_realtime add table public.emergency_reports;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists family_members_touch_updated_at on public.family_members;
create trigger family_members_touch_updated_at
before update on public.family_members
for each row execute procedure public.touch_updated_at();

drop trigger if exists emergency_reports_touch_updated_at on public.emergency_reports;
create trigger emergency_reports_touch_updated_at
before update on public.emergency_reports
for each row execute procedure public.touch_updated_at();

create or replace function public.find_profile_by_user_code(search_code text)
returns table (
  id uuid,
  user_code text,
  full_name text,
  role text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select profiles.id, profiles.user_code, profiles.full_name, profiles.role, profiles.avatar_url
  from public.profiles
  where profiles.user_code = upper(trim(search_code))
  limit 1;
$$;

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

create or replace function public.has_report_assignment(
  target_report_id uuid,
  target_operator_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.operator_assignments
    where operator_assignments.report_id = target_report_id
      and operator_assignments.operator_id = target_operator_id
      and operator_assignments.status in ('assigned', 'accepted', 'completed')
  );
$$;

create or replace function public.is_report_owner(target_report_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.emergency_reports
    where emergency_reports.id = target_report_id
      and (
        emergency_reports.reporter_id = auth.uid()
        or emergency_reports.subject_profile_id = auth.uid()
      )
  );
$$;

create or replace function public.can_access_report(target_report_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.emergency_reports
    where emergency_reports.id = target_report_id
      and (
        emergency_reports.reporter_id = auth.uid()
        or emergency_reports.subject_profile_id = auth.uid()
        or emergency_reports.assigned_operator_id = auth.uid()
      )
  )
  or public.has_report_assignment(target_report_id, auth.uid());
$$;

create or replace function public.can_read_profile_from_report(target_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.emergency_reports
    where (
      emergency_reports.reporter_id = auth.uid()
      or emergency_reports.subject_profile_id = auth.uid()
      or emergency_reports.assigned_operator_id = auth.uid()
      or public.has_report_assignment(emergency_reports.id, auth.uid())
    )
    and target_profile_id in (
      emergency_reports.reporter_id,
      emergency_reports.subject_profile_id,
      emergency_reports.assigned_operator_id
    )
  );
$$;

create or replace function public.assign_operator_to_report(target_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_operator_id uuid;
  chosen_workload integer;
  existing_operator_id uuid;
begin
  select operator_assignments.operator_id
  into existing_operator_id
  from public.operator_assignments
  where operator_assignments.report_id = target_report_id
    and operator_assignments.status in ('assigned', 'accepted')
  limit 1;

  if existing_operator_id is not null then
    return existing_operator_id;
  end if;

  select profiles.id, count(operator_assignments.id)::integer as active_workload
  into chosen_operator_id, chosen_workload
  from public.profiles
  left join public.operator_assignments
    on operator_assignments.operator_id = profiles.id
    and operator_assignments.status in ('assigned', 'accepted')
  where profiles.role = 'dispatcher'
    and profiles.is_available = true
    and profiles.last_active_at is not null
    and profiles.last_active_at >= now() - interval '5 minutes'
  group by profiles.id
  order by active_workload asc, random()
  limit 1;

  if chosen_operator_id is null then
    return null;
  end if;

  insert into public.operator_assignments (
    report_id,
    operator_id,
    workload_snapshot
  )
  values (
    target_report_id,
    chosen_operator_id,
    coalesce(chosen_workload, 0)
  )
  on conflict (report_id, operator_id)
  do nothing;

  update public.emergency_reports
  set
    assigned_operator_id = chosen_operator_id,
    status = 'assigned'
  where id = target_report_id
    and assigned_operator_id is null;

  return chosen_operator_id;
end;
$$;

create or replace function public.claim_report_for_operator(target_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_operator_id uuid;
  chosen_workload integer;
begin
  if not exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'dispatcher'
      and profiles.is_available = true
      and profiles.last_active_at is not null
      and profiles.last_active_at >= now() - interval '5 minutes'
  ) then
    raise exception 'Operator belum online.';
  end if;

  select emergency_reports.assigned_operator_id
  into existing_operator_id
  from public.emergency_reports
  where emergency_reports.id = target_report_id
  for update;

  if not found then
    raise exception 'Laporan tidak ditemukan.';
  end if;

  if existing_operator_id is not null and existing_operator_id <> auth.uid() then
    raise exception 'Laporan sudah ditangani operator lain.';
  end if;

  select count(operator_assignments.id)::integer
  into chosen_workload
  from public.operator_assignments
  where operator_assignments.operator_id = auth.uid()
    and operator_assignments.status in ('assigned', 'accepted');

  insert into public.operator_assignments (
    report_id,
    operator_id,
    status,
    assigned_by,
    workload_snapshot,
    accepted_at
  )
  values (
    target_report_id,
    auth.uid(),
    'accepted',
    'operator',
    coalesce(chosen_workload, 0),
    now()
  )
  on conflict (report_id, operator_id)
  do update
  set
    status = 'accepted',
    accepted_at = coalesce(operator_assignments.accepted_at, now());

  update public.emergency_reports
  set
    assigned_operator_id = auth.uid(),
    status = 'accepted',
    accepted_at = coalesce(accepted_at, now()),
    dispatched_at = coalesce(dispatched_at, now())
  where id = target_report_id
    and (
      assigned_operator_id is null
      or assigned_operator_id = auth.uid()
    );

  return auth.uid();
end;
$$;

alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.emergency_reports enable row level security;
alter table public.operator_assignments enable row level security;
alter table public.messages enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update on public.emergency_reports to authenticated;
grant select, insert, update on public.operator_assignments to authenticated;
grant select, insert, update on public.messages to authenticated;
grant execute on function public.find_profile_by_user_code(text) to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.has_report_assignment(uuid, uuid) to authenticated;
grant execute on function public.is_report_owner(uuid) to authenticated;
grant execute on function public.can_access_report(uuid) to authenticated;
grant execute on function public.can_read_profile_from_report(uuid) to authenticated;
grant execute on function public.assign_operator_to_report(uuid) to authenticated;
grant execute on function public.claim_report_for_operator(uuid) to authenticated;

create or replace function public.can_store_report_voice_note(object_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  parts text[];
  target_report_id uuid;
begin
  parts := storage.foldername(object_name);

  if array_length(parts, 1) < 2 then
    return false;
  end if;

  if parts[2] <> auth.uid()::text then
    return false;
  end if;

  begin
    target_report_id := parts[1]::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.can_access_report(target_report_id);
end;
$$;

grant execute on function public.can_store_report_voice_note(text) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile avatars are public" on storage.objects;
create policy "Profile avatars are public"
on storage.objects
for select
to public
using (bucket_id = 'profile-avatars');

drop policy if exists "Users can upload their profile avatar" on storage.objects;
create policy "Users can upload their profile avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their profile avatar" on storage.objects;
create policy "Users can update their profile avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their profile avatar" on storage.objects;
create policy "Users can delete their profile avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'report-voice-notes',
  'report-voice-notes',
  true,
  2097152,
  array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/webm', 'audio/3gpp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Report voice notes are public" on storage.objects;
create policy "Report voice notes are public"
on storage.objects
for select
to public
using (bucket_id = 'report-voice-notes');

drop policy if exists "Participants can upload report voice notes" on storage.objects;
create policy "Participants can upload report voice notes"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'report-voice-notes'
  and public.can_store_report_voice_note(name)
);

drop policy if exists "Participants can update report voice notes" on storage.objects;
create policy "Participants can update report voice notes"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'report-voice-notes'
  and public.can_store_report_voice_note(name)
)
with check (
  bucket_id = 'report-voice-notes'
  and public.can_store_report_voice_note(name)
);

drop policy if exists "Participants can delete report voice notes" on storage.objects;
create policy "Participants can delete report voice notes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'report-voice-notes'
  and public.can_store_report_voice_note(name)
);

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can read linked family profiles" on public.profiles;
create policy "Users can read linked family profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.family_members
    where family_members.status in ('pending', 'accepted')
      and (
        (family_members.owner_id = auth.uid() and family_members.member_id = profiles.id)
        or
        (family_members.member_id = auth.uid() and family_members.owner_id = profiles.id)
      )
  )
);

drop policy if exists "Operators can read profiles from assigned reports" on public.profiles;
drop policy if exists "Participants can read profiles from active reports" on public.profiles;
create policy "Participants can read profiles from active reports"
on public.profiles
for select
to authenticated
using (public.can_read_profile_from_report(profiles.id));

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read family links they belong to" on public.family_members;
create policy "Users can read family links they belong to"
on public.family_members
for select
to authenticated
using (auth.uid() = owner_id or auth.uid() = member_id);

drop policy if exists "Users can create family link requests" on public.family_members;
create policy "Users can create family link requests"
on public.family_members
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Users can update family links they belong to" on public.family_members;
create policy "Users can update family links they belong to"
on public.family_members
for update
to authenticated
using (auth.uid() = owner_id or auth.uid() = member_id)
with check (auth.uid() = owner_id or auth.uid() = member_id);

drop policy if exists "Users can delete family links they own" on public.family_members;
create policy "Users can delete family links they own"
on public.family_members
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Reporters can create their own reports" on public.emergency_reports;
create policy "Reporters can create their own reports"
on public.emergency_reports
for insert
to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "Reporters can read their own reports" on public.emergency_reports;
create policy "Reporters can read their own reports"
on public.emergency_reports
for select
to authenticated
using (
  auth.uid() = reporter_id
  or auth.uid() = subject_profile_id
  or exists (
    select 1
    from public.family_members
    where family_members.status = 'accepted'
      and family_members.owner_id = auth.uid()
      and family_members.member_id = emergency_reports.subject_profile_id
  )
);

drop policy if exists "Assigned operators can read reports" on public.emergency_reports;
create policy "Assigned operators can read reports"
on public.emergency_reports
for select
to authenticated
using (
  assigned_operator_id = auth.uid()
  or public.has_report_assignment(emergency_reports.id, auth.uid())
);

drop policy if exists "Operators can read pending reports for queue" on public.emergency_reports;
create policy "Operators can read pending reports for queue"
on public.emergency_reports
for select
to authenticated
using (public.current_user_role() = 'dispatcher');

drop policy if exists "Reporters and operators can update active reports" on public.emergency_reports;
create policy "Reporters and operators can update active reports"
on public.emergency_reports
for update
to authenticated
using (
  auth.uid() = reporter_id
  or assigned_operator_id = auth.uid()
  or public.has_report_assignment(emergency_reports.id, auth.uid())
)
with check (
  auth.uid() = reporter_id
  or assigned_operator_id = auth.uid()
  or public.has_report_assignment(emergency_reports.id, auth.uid())
);

drop policy if exists "Operators can read their assignments" on public.operator_assignments;
create policy "Operators can read their assignments"
on public.operator_assignments
for select
to authenticated
using (
  operator_id = auth.uid()
  or public.is_report_owner(operator_assignments.report_id)
);

drop policy if exists "Operators can create their assignments" on public.operator_assignments;
create policy "Operators can create their assignments"
on public.operator_assignments
for insert
to authenticated
with check (operator_id = auth.uid());

drop policy if exists "Operators can update their assignments" on public.operator_assignments;
create policy "Operators can update their assignments"
on public.operator_assignments
for update
to authenticated
using (operator_id = auth.uid())
with check (operator_id = auth.uid());

drop policy if exists "Participants can read report messages" on public.messages;
create policy "Participants can read report messages"
on public.messages
for select
to authenticated
using (public.can_access_report(messages.report_id));

drop policy if exists "Participants can send report messages" on public.messages;
create policy "Participants can send report messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.can_access_report(messages.report_id)
);

drop policy if exists "Participants can mark messages read" on public.messages;
create policy "Participants can mark messages read"
on public.messages
for update
to authenticated
using (public.can_access_report(messages.report_id))
with check (public.can_access_report(messages.report_id));

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

insert into public.profiles (
  id,
  email,
  full_name,
  role,
  phone,
  address,
  avatar_url
)
select
  users.id,
  users.email,
  users.raw_user_meta_data ->> 'full_name',
  coalesce(users.raw_user_meta_data ->> 'role', 'reporter'),
  '',
  users.raw_user_meta_data ->> 'address',
  ''
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
);

notify pgrst, 'reload schema';
