select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'family_members',
    'emergency_reports',
    'operator_assignments',
    'messages'
  )
order by table_name;

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('id', 'user_code', 'email', 'full_name', 'address', 'role')
order by ordinal_position;

notify pgrst, 'reload schema';
