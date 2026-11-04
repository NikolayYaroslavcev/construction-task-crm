-- Task history also records reassignment and edits (not only status changes),
-- and the tables are published to Realtime so open screens update live (RLS still applies).

alter table public.task_status_history
  add column event text not null default 'status' check (event in ('status', 'reassign', 'edit')),
  add column from_assignee uuid references public.profiles (id),
  add column to_assignee uuid references public.profiles (id);

create function public.tasks_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  changed text[] := '{}';
begin
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.task_status_history
      (task_id, task_title, event, from_status, to_status, changed_by, from_assignee, to_assignee)
    values (new.id, new.title, 'reassign', new.status, new.status, auth.uid(), old.assignee_id, new.assignee_id);
  end if;

  if new.title is distinct from old.title then changed := changed || 'название'; end if;
  if new.description is distinct from old.description then changed := changed || 'описание'; end if;
  if new.object_id is distinct from old.object_id then changed := changed || 'объект'; end if;
  if cardinality(changed) > 0 then
    insert into public.task_status_history (task_id, task_title, event, from_status, to_status, changed_by, comment)
    values (new.id, new.title, 'edit', new.status, new.status, auth.uid(), array_to_string(changed, ', '));
  end if;
  return new;
end $$;
revoke execute on function public.tasks_after_update() from public, anon, authenticated;

create trigger tasks_after_update after update of title, description, object_id, assignee_id on public.tasks
  for each row execute function public.tasks_after_update();

alter publication supabase_realtime add table public.objects, public.tasks, public.task_status_history;
