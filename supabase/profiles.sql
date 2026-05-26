create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text not null check (role in ('reporter', 'dispatcher')),
  unit_type text check (unit_type in ('police', 'ambulance', 'firefighter')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists user_code text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists is_available boolean not null default true;
alter table public.profiles add column if not exists last_active_at timestamptz;
alter table public.profiles add column if not exists unit_type text;

update public.profiles
set role = 'dispatcher'
where role = 'responder';

do $$
begin
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles add constraint profiles_role_check
    check (role in ('reporter', 'dispatcher'));

  alter table public.profiles drop constraint if exists profiles_unit_type_check;
  alter table public.profiles add constraint profiles_unit_type_check
    check (unit_type is null or unit_type in ('police', 'ambulance', 'firefighter'));
end;
$$;

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

create table if not exists public.unit_dispatches (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.emergency_reports(id) on delete cascade,
  dispatcher_id uuid not null references public.profiles(id) on delete cascade,
  responder_id uuid references public.profiles(id) on delete set null,
  unit_type text not null check (unit_type in ('police', 'ambulance', 'firefighter')),
  status text not null default 'sent'
    check (status in ('sent', 'accepted', 'on_route', 'arrived', 'completed', 'cancelled')),
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  departed_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  current_latitude double precision,
  current_longitude double precision,
  current_accuracy double precision,
  last_location_at timestamptz
);

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
create index if not exists unit_dispatches_report_id_idx on public.unit_dispatches(report_id);
create index if not exists unit_dispatches_responder_id_idx on public.unit_dispatches(responder_id);
create index if not exists unit_dispatches_status_idx on public.unit_dispatches(status);
alter table public.unit_dispatches
drop constraint if exists unit_dispatches_unique_active_unit;
create unique index if not exists unit_dispatches_one_active_unit_per_report
on public.unit_dispatches (report_id, unit_type)
where status in ('sent', 'accepted', 'on_route', 'arrived');
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

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'unit_dispatches'
  ) then
    alter publication supabase_realtime add table public.unit_dispatches;
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

create or replace function public.current_user_unit_type()
returns text
language sql
security definer
set search_path = public
as $$
  select profiles.unit_type
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

create or replace function public.has_unit_dispatch(
  target_report_id uuid,
  target_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.unit_dispatches
    where unit_dispatches.report_id = target_report_id
      and (
        unit_dispatches.dispatcher_id = target_user_id
        or unit_dispatches.responder_id = target_user_id
      )
      and unit_dispatches.status in ('sent', 'accepted', 'on_route', 'arrived', 'completed')
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
  or public.has_report_assignment(target_report_id, auth.uid())
  or public.has_unit_dispatch(target_report_id, auth.uid());
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
      or public.has_unit_dispatch(emergency_reports.id, auth.uid())
    )
    and target_profile_id in (
      emergency_reports.reporter_id,
      emergency_reports.subject_profile_id,
      emergency_reports.assigned_operator_id
    )
  )
  or exists (
    select 1
    from public.unit_dispatches
    where (
      unit_dispatches.dispatcher_id = auth.uid()
      or unit_dispatches.responder_id = auth.uid()
      or public.is_report_owner(unit_dispatches.report_id)
    )
    and target_profile_id in (
      unit_dispatches.dispatcher_id,
      unit_dispatches.responder_id
    )
  );
$$;

create or replace function public.get_family_active_reports()
returns setof public.emergency_reports
language sql
security definer
set search_path = public
as $$
  select distinct emergency_reports.*
  from public.emergency_reports
  join public.family_members
    on family_members.status = 'accepted'
    and (
      (
        family_members.owner_id = auth.uid()
        and family_members.member_id in (
          emergency_reports.reporter_id,
          emergency_reports.subject_profile_id
        )
      )
      or
      (
        family_members.member_id = auth.uid()
        and family_members.owner_id in (
          emergency_reports.reporter_id,
          emergency_reports.subject_profile_id
        )
      )
    )
  where emergency_reports.status in (
    'pending',
    'assigned',
    'accepted',
    'on_route',
    'arrived'
  )
  order by emergency_reports.created_at desc;
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
    and profiles.unit_type is null
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
      and profiles.unit_type is null
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

create or replace function public.dispatch_report_to_unit(
  target_report_id uuid,
  target_unit_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_responder_id uuid;
  existing_dispatch_id uuid;
begin
  if target_unit_type not in ('police', 'ambulance', 'firefighter') then
    raise exception 'Tipe unit tidak valid.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'dispatcher'
      and profiles.unit_type is null
  ) then
    raise exception 'Hanya operator pusat yang bisa mengirim bantuan.';
  end if;

  if not exists (
    select 1
    from public.emergency_reports
    where emergency_reports.id = target_report_id
      and (
        emergency_reports.assigned_operator_id = auth.uid()
        or public.has_report_assignment(target_report_id, auth.uid())
      )
  ) then
    raise exception 'Laporan belum ditangani operator ini.';
  end if;

  select unit_dispatches.id
  into existing_dispatch_id
  from public.unit_dispatches
  where unit_dispatches.report_id = target_report_id
    and unit_dispatches.unit_type = target_unit_type
    and unit_dispatches.status in ('sent', 'accepted', 'on_route', 'arrived')
  limit 1;

  if existing_dispatch_id is not null then
    return existing_dispatch_id;
  end if;

  select profiles.id
  into chosen_responder_id
  from public.profiles
  left join public.unit_dispatches
    on unit_dispatches.responder_id = profiles.id
    and unit_dispatches.status in ('sent', 'accepted', 'on_route', 'arrived')
  where profiles.role in ('dispatcher', 'responder')
    and profiles.unit_type = target_unit_type
    and profiles.is_available = true
    and profiles.last_active_at is not null
    and profiles.last_active_at >= now() - interval '5 minutes'
  group by profiles.id
  order by count(unit_dispatches.id) asc, random()
  limit 1;

  if chosen_responder_id is null then
    raise exception 'Belum ada petugas % yang online.', target_unit_type;
  end if;

  insert into public.unit_dispatches (
    report_id,
    dispatcher_id,
    responder_id,
    unit_type,
    status
  )
  values (
    target_report_id,
    auth.uid(),
    chosen_responder_id,
    target_unit_type,
    'sent'
  )
  returning id into existing_dispatch_id;

  update public.emergency_reports
  set
    status = case
      when status in ('pending', 'assigned', 'accepted') then 'on_route'
      else status
    end,
    dispatched_at = coalesce(dispatched_at, now())
  where id = target_report_id;

  return existing_dispatch_id;
end;
$$;

create or replace function public.update_unit_dispatch_status(
  target_dispatch_id uuid,
  target_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_report_id uuid;
begin
  if target_status not in ('accepted', 'on_route', 'arrived', 'completed', 'cancelled') then
    raise exception 'Status unit tidak valid.';
  end if;

  update public.unit_dispatches
  set
    status = target_status,
    accepted_at = case
      when target_status in ('accepted', 'on_route', 'arrived', 'completed')
        then coalesce(accepted_at, now())
      else accepted_at
    end,
    departed_at = case
      when target_status in ('on_route', 'arrived', 'completed')
        then coalesce(departed_at, now())
      else departed_at
    end,
    arrived_at = case
      when target_status in ('arrived', 'completed')
        then coalesce(arrived_at, now())
      else arrived_at
    end,
    completed_at = case
      when target_status = 'completed' then coalesce(completed_at, now())
      else completed_at
    end
  where id = target_dispatch_id
    and (
      responder_id = auth.uid()
      or dispatcher_id = auth.uid()
    )
  returning report_id into target_report_id;

  if target_report_id is null then
    raise exception 'Tugas tidak ditemukan.';
  end if;

  if target_status = 'arrived' then
    update public.emergency_reports
    set status = 'arrived', arrived_at = coalesce(arrived_at, now())
    where id = target_report_id;
  elsif target_status = 'completed' then
    update public.emergency_reports
    set status = 'resolved', resolved_at = coalesce(resolved_at, now())
    where id = target_report_id
      and not exists (
        select 1
        from public.unit_dispatches
        where unit_dispatches.report_id = target_report_id
          and unit_dispatches.id <> target_dispatch_id
          and unit_dispatches.status in ('sent', 'accepted', 'on_route', 'arrived')
      );
  elsif target_status in ('accepted', 'on_route') then
    update public.emergency_reports
    set status = 'on_route', dispatched_at = coalesce(dispatched_at, now())
    where id = target_report_id
      and status in ('pending', 'assigned', 'accepted');
  end if;

  return target_dispatch_id;
end;
$$;

create or replace function public.update_unit_dispatch_location(
  target_dispatch_id uuid,
  latitude double precision,
  longitude double precision,
  accuracy double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.unit_dispatches
  set
    current_latitude = latitude,
    current_longitude = longitude,
    current_accuracy = accuracy,
    last_location_at = now()
  where id = target_dispatch_id
    and responder_id = auth.uid()
    and status in ('sent', 'accepted', 'on_route', 'arrived')
  returning id into target_dispatch_id;

  if target_dispatch_id is null then
    raise exception 'Tugas aktif tidak ditemukan.';
  end if;

  return target_dispatch_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.emergency_reports enable row level security;
alter table public.operator_assignments enable row level security;
alter table public.unit_dispatches enable row level security;
alter table public.messages enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update on public.emergency_reports to authenticated;
grant select, insert, update on public.operator_assignments to authenticated;
grant select, insert, update on public.unit_dispatches to authenticated;
grant select, insert, update on public.messages to authenticated;
grant execute on function public.find_profile_by_user_code(text) to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_unit_type() to authenticated;
grant execute on function public.has_report_assignment(uuid, uuid) to authenticated;
grant execute on function public.has_unit_dispatch(uuid, uuid) to authenticated;
grant execute on function public.is_report_owner(uuid) to authenticated;
grant execute on function public.can_access_report(uuid) to authenticated;
grant execute on function public.can_read_profile_from_report(uuid) to authenticated;
grant execute on function public.get_family_active_reports() to authenticated;
grant execute on function public.assign_operator_to_report(uuid) to authenticated;
grant execute on function public.claim_report_for_operator(uuid) to authenticated;
grant execute on function public.dispatch_report_to_unit(uuid, text) to authenticated;
grant execute on function public.update_unit_dispatch_status(uuid, text) to authenticated;
grant execute on function public.update_unit_dispatch_location(uuid, double precision, double precision, double precision) to authenticated;

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
      and (
        (
          family_members.owner_id = auth.uid()
          and family_members.member_id in (
            emergency_reports.reporter_id,
            emergency_reports.subject_profile_id
          )
        )
        or
        (
          family_members.member_id = auth.uid()
          and family_members.owner_id in (
            emergency_reports.reporter_id,
            emergency_reports.subject_profile_id
          )
        )
      )
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
  or public.has_unit_dispatch(emergency_reports.id, auth.uid())
);

drop policy if exists "Operators can read pending reports for queue" on public.emergency_reports;
create policy "Operators can read pending reports for queue"
on public.emergency_reports
for select
to authenticated
using (
  public.current_user_role() = 'dispatcher'
  and public.current_user_unit_type() is null
);

drop policy if exists "Reporters and operators can update active reports" on public.emergency_reports;
create policy "Reporters and operators can update active reports"
on public.emergency_reports
for update
to authenticated
using (
  auth.uid() = reporter_id
  or assigned_operator_id = auth.uid()
  or public.has_report_assignment(emergency_reports.id, auth.uid())
  or public.has_unit_dispatch(emergency_reports.id, auth.uid())
)
with check (
  auth.uid() = reporter_id
  or assigned_operator_id = auth.uid()
  or public.has_report_assignment(emergency_reports.id, auth.uid())
  or public.has_unit_dispatch(emergency_reports.id, auth.uid())
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

drop policy if exists "Participants can read unit dispatches" on public.unit_dispatches;
create policy "Participants can read unit dispatches"
on public.unit_dispatches
for select
to authenticated
using (
  dispatcher_id = auth.uid()
  or responder_id = auth.uid()
  or public.is_report_owner(unit_dispatches.report_id)
  or public.has_report_assignment(unit_dispatches.report_id, auth.uid())
);

drop policy if exists "Dispatchers can create unit dispatches" on public.unit_dispatches;
create policy "Dispatchers can create unit dispatches"
on public.unit_dispatches
for insert
to authenticated
with check (
  dispatcher_id = auth.uid()
  and public.current_user_role() = 'dispatcher'
  and public.current_user_unit_type() is null
);

drop policy if exists "Dispatch participants can update unit dispatches" on public.unit_dispatches;
create policy "Dispatch participants can update unit dispatches"
on public.unit_dispatches
for update
to authenticated
using (
  dispatcher_id = auth.uid()
  or responder_id = auth.uid()
)
with check (
  dispatcher_id = auth.uid()
  or responder_id = auth.uid()
);

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
  safe_unit_type text;
begin
  safe_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'reporter');
  safe_unit_type := nullif(new.raw_user_meta_data ->> 'unit_type', '');

  if safe_role = 'responder' then
    safe_role := 'dispatcher';
  end if;

  if safe_role not in ('reporter', 'dispatcher') then
    safe_role := 'reporter';
  end if;

  if safe_role <> 'dispatcher' or safe_unit_type not in ('police', 'ambulance', 'firefighter') then
    safe_unit_type := null;
  end if;

  insert into public.profiles (
    id,
    user_code,
    email,
    full_name,
    role,
    unit_type,
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
    safe_unit_type,
    '',
    new.raw_user_meta_data ->> 'address',
    ''
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role = excluded.role,
    unit_type = excluded.unit_type,
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
  unit_type,
  phone,
  address,
  avatar_url
)
select
  users.id,
  users.email,
  users.raw_user_meta_data ->> 'full_name',
  case
    when users.raw_user_meta_data ->> 'role' = 'reporter'
      then users.raw_user_meta_data ->> 'role'
    when users.raw_user_meta_data ->> 'role' in ('dispatcher', 'responder')
      then 'dispatcher'
    else 'reporter'
  end,
  case
    when users.raw_user_meta_data ->> 'role' in ('dispatcher', 'responder')
      and users.raw_user_meta_data ->> 'unit_type' in ('police', 'ambulance', 'firefighter')
      then users.raw_user_meta_data ->> 'unit_type'
    else null
  end,
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
