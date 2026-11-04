-- 1. Role helper moves to a schema that is not exposed through the API (no /rpc/is_manager endpoint).
-- 2. Status history outlives its task: deleting a task no longer deletes its history,
--    the records stay as an audit log (task_id becomes null, the task title is kept).

create schema if not exists private;
grant usage on schema private to authenticated;

create function private.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
$$;
revoke execute on function private.is_manager() from public, anon;
grant execute on function private.is_manager() to authenticated;

-- policies: switch to private.is_manager()
drop policy profiles_select on public.profiles;
drop policy objects_select on public.objects;
drop policy objects_insert on public.objects;
drop policy objects_update on public.objects;
drop policy objects_delete on public.objects;
drop policy tasks_select on public.tasks;
drop policy tasks_insert on public.tasks;
drop policy tasks_update on public.tasks;
drop policy tasks_delete on public.tasks;
drop policy history_select on public.task_status_history;

create policy profiles_select on public.profiles for select to authenticated
  using ((select private.is_manager()) or id = (select auth.uid()) or role = 'manager');

create policy objects_select on public.objects for select to authenticated
  using (
    (select private.is_manager())
    or exists (select 1 from public.tasks t where t.object_id = objects.id and t.assignee_id = (select auth.uid()))
  );
create policy objects_insert on public.objects for insert to authenticated
  with check ((select private.is_manager()));
create policy objects_update on public.objects for update to authenticated
  using ((select private.is_manager())) with check ((select private.is_manager()));
create policy objects_delete on public.objects for delete to authenticated
  using ((select private.is_manager()));

create policy tasks_select on public.tasks for select to authenticated
  using ((select private.is_manager()) or assignee_id = (select auth.uid()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check ((select private.is_manager()));
create policy tasks_update on public.tasks for update to authenticated
  using ((select private.is_manager())) with check ((select private.is_manager()));
create policy tasks_delete on public.tasks for delete to authenticated
  using ((select private.is_manager()));

-- history of a live task: visible to whoever sees the task; history of a deleted task: managers only
create policy history_select on public.task_status_history for select to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id)
    or (task_id is null and (select private.is_manager()))
  );

-- history survives task deletion
alter table public.task_status_history add column task_title text;
update public.task_status_history h set task_title = t.title from public.tasks t where t.id = h.task_id;
alter table public.task_status_history alter column task_title set not null;
alter table public.task_status_history alter column task_id drop not null;
alter table public.task_status_history drop constraint task_status_history_task_id_fkey;
alter table public.task_status_history
  add constraint task_status_history_task_id_fkey foreign key (task_id) references public.tasks (id) on delete set null;

create or replace function public.tasks_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.task_status_history (task_id, task_title, from_status, to_status, changed_by)
  values (new.id, new.title, null, 'new', new.author_id);
  return new;
end $$;

create or replace function public.change_task_status(p_task_id uuid, p_to public.task_status, p_comment text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.tasks;
  uid uuid := auth.uid();
  mgr boolean := private.is_manager();
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
  insert into public.task_status_history (task_id, task_title, from_status, to_status, changed_by, comment)
  values (p_task_id, t.title, t.status, p_to, uid, note);
end $$;

drop function public.is_manager();
