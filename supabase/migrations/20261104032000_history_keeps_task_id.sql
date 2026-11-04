-- History keeps the original task id after the task is deleted (no FK), so the audit log
-- of a deleted task stays grouped. Live task: visible to whoever sees the task;
-- deleted task: managers only.
alter table public.task_status_history drop constraint task_status_history_task_id_fkey;
delete from public.task_status_history where task_id is null; -- leftovers from test runs
alter table public.task_status_history alter column task_id set not null;

drop policy history_select on public.task_status_history;
create policy history_select on public.task_status_history for select to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id)
    or ((select private.is_manager()) and not exists (select 1 from public.tasks t where t.id = task_id))
  );
