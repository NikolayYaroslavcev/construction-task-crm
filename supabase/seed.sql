-- Profiles for test users. Create the users first in Supabase: Authentication -> Users -> Add user (Auto Confirm).
-- Objects and tasks are created by `npm run seed` through the API, so their history is real.
insert into public.profiles (id, full_name, role)
select u.id, v.full_name, v.role::public.user_role
from (values
  ('manager@test.ru', 'Иван Петров (прораб)', 'manager'),
  ('worker1@test.ru', 'Алексей Смирнов', 'executor'),
  ('worker2@test.ru', 'Дмитрий Козлов', 'executor')
) as v(email, full_name, role)
join auth.users u on u.email = v.email
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;
