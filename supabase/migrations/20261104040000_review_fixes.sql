-- 1. The server always generates the task id: a client-chosen id could reuse a deleted task's id
--    and re-attach that task's audit history to a new task.
-- 2. Deleting a task is itself recorded in the audit log (who and when).
-- 3. Deleted-task history is selected in the database (view), not filtered on the client.

create or replace function public.tasks_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.id := gen_random_uuid();
    new.status := 'new';
    new.author_id := auth.uid();
    new.created_at := now();
  end if;
  if not exists (select 1 from public.profiles where id = new.assignee_id and role = 'executor') then
    raise exception 'Assignee must be an executor';
  end if;
  return new;
end $$;

alter table public.task_status_history drop constraint task_status_history_event_check;
alter table public.task_status_history
  add constraint task_status_history_event_check check (event in ('status', 'reassign', 'edit', 'delete'));

create function public.tasks_before_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.task_status_history (task_id, task_title, event, from_status, to_status, changed_by)
  values (old.id, old.title, 'delete', old.status, old.status, auth.uid());
  return old;
end $$;
revoke execute on function public.tasks_before_delete() from public, anon, authenticated;

create trigger tasks_before_delete before delete on public.tasks
  for each row execute function public.tasks_before_delete();

-- security_invoker: the caller's RLS applies, so only managers get rows
create view public.deleted_task_history with (security_invoker = true) as
  select h.* from public.task_status_history h
  where not exists (select 1 from public.tasks t where t.id = h.task_id);

revoke all on public.deleted_task_history from anon, authenticated;
grant select on public.deleted_task_history to authenticated;
