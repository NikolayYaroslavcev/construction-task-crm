-- Mini CRM: objects (construction sites), tasks, status history.
-- Access rules live in the database (RLS + column grants + one RPC for status changes),
-- so they hold even when the API is called directly, bypassing the UI.

create type public.user_role as enum ('manager', 'executor');
create type public.task_status as enum ('new', 'in_progress', 'review', 'accepted', 'rework');

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  address text not null check (length(trim(address)) > 0),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  object_id uuid not null references public.objects (id) on delete restrict,
  assignee_id uuid not null references public.profiles (id),
  author_id uuid not null references public.profiles (id),
  status public.task_status not null default 'new',
  created_at timestamptz not null default now()
);
create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

create table public.task_status_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  from_status public.task_status,
  to_status public.task_status not null,
  changed_by uuid not null references public.profiles (id),
  comment text,
  created_at timestamptz not null default now()
);
create index task_status_history_task_id_idx on public.task_status_history (task_id);

-- ---------------------------------------------------------------- helpers

-- security definer: reads profiles without going through profiles RLS (avoids recursion)
create function public.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
$$;

-- ---------------------------------------------------------------- triggers

-- On insert the server decides status, author and creation time; client values are ignored.
-- The assignee must be an executor (on insert and on reassignment).
create function public.tasks_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'new';
    new.author_id := auth.uid();
    new.created_at := now();
  end if;
  if not exists (select 1 from public.profiles where id = new.assignee_id and role = 'executor') then
    raise exception 'Assignee must be an executor';
  end if;
  return new;
end $$;

create trigger tasks_before_insert before insert on public.tasks
  for each row execute function public.tasks_before_write();
create trigger tasks_before_update_assignee before update of assignee_id on public.tasks
  for each row execute function public.tasks_before_write();

-- First history entry: "— -> new"
create function public.tasks_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.task_status_history (task_id, from_status, to_status, changed_by)
  values (new.id, null, 'new', new.author_id);
  return new;
end $$;

create trigger tasks_after_insert after insert on public.tasks
  for each row execute function public.tasks_after_insert();

-- ---------------------------------------------------------------- status transitions
-- The only way to change a task status. Checks the transition matrix and the actor,
-- updates the task and writes history in one transaction.

create function public.change_task_status(p_task_id uuid, p_to public.task_status, p_comment text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.tasks;
  uid uuid := auth.uid();
  mgr boolean := public.is_manager();
  note text := nullif(trim(p_comment), '');
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into t from public.tasks where id = p_task_id for update;
  -- an executor must not learn that someone else's task exists
  if not found or (not mgr and t.assignee_id <> uid) then
    raise exception 'Task not found';
  end if;

  if not (
       (t.status = 'new'         and p_to = 'in_progress' and t.assignee_id = uid)
    or (t.status = 'in_progress' and p_to = 'review'      and t.assignee_id = uid)
    or (t.status = 'review'      and p_to = 'accepted'    and mgr)
    or (t.status = 'review'      and p_to = 'rework'      and mgr and note is not null)
    or (t.status = 'rework'      and p_to = 'in_progress' and t.assignee_id = uid)
  ) then
    if t.status = 'review' and p_to = 'rework' and mgr then
      raise exception 'A comment is required to return a task for rework';
    end if;
    raise exception 'Transition % -> % is not allowed', t.status, p_to;
  end if;

  update public.tasks set status = p_to where id = p_task_id;
  insert into public.task_status_history (task_id, from_status, to_status, changed_by, comment)
  values (p_task_id, t.status, p_to, uid, note);
end $$;

-- ---------------------------------------------------------------- privileges
-- Anonymous users get nothing. Authenticated users get only what is listed;
-- RLS below narrows it further by role.

revoke all on public.profiles, public.objects, public.tasks, public.task_status_history from anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.objects to authenticated;
grant select, insert, delete on public.tasks to authenticated;
-- status, author_id, created_at are not updatable through the API at all
grant update (title, description, object_id, assignee_id) on public.tasks to authenticated;
-- history is read-only through the API: no insert/update/delete for anyone
grant select on public.task_status_history to authenticated;

revoke execute on function public.is_manager() from public, anon;
revoke execute on function public.change_task_status(uuid, public.task_status, text) from public, anon;
revoke execute on function public.tasks_before_write() from public, anon, authenticated;
revoke execute on function public.tasks_after_insert() from public, anon, authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

-- profiles: managers see everyone; an executor sees themselves and managers
-- (managers are the only other people in their tasks and history)
create policy profiles_select on public.profiles for select to authenticated
  using ((select public.is_manager()) or id = (select auth.uid()) or role = 'manager');

-- objects: managers see all; an executor sees objects where they have a task
create policy objects_select on public.objects for select to authenticated
  using (
    (select public.is_manager())
    or exists (select 1 from public.tasks t where t.object_id = objects.id and t.assignee_id = (select auth.uid()))
  );
create policy objects_insert on public.objects for insert to authenticated
  with check ((select public.is_manager()));
create policy objects_update on public.objects for update to authenticated
  using ((select public.is_manager())) with check ((select public.is_manager()));
create policy objects_delete on public.objects for delete to authenticated
  using ((select public.is_manager()));

-- tasks: managers see all; an executor sees only tasks assigned to them
create policy tasks_select on public.tasks for select to authenticated
  using ((select public.is_manager()) or assignee_id = (select auth.uid()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check ((select public.is_manager()));
create policy tasks_update on public.tasks for update to authenticated
  using ((select public.is_manager())) with check ((select public.is_manager()));
create policy tasks_delete on public.tasks for delete to authenticated
  using ((select public.is_manager()));

-- history: visible if the task is visible (tasks RLS applies inside the subquery)
create policy history_select on public.task_status_history for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));
