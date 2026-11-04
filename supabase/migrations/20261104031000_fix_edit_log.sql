-- array || 'text' is parsed as array || array; use array_append for the changed-fields list.
create or replace function public.tasks_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  changed text[] := '{}';
begin
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.task_status_history
      (task_id, task_title, event, from_status, to_status, changed_by, from_assignee, to_assignee)
    values (new.id, new.title, 'reassign', new.status, new.status, auth.uid(), old.assignee_id, new.assignee_id);
  end if;

  if new.title is distinct from old.title then changed := array_append(changed, 'название'); end if;
  if new.description is distinct from old.description then changed := array_append(changed, 'описание'); end if;
  if new.object_id is distinct from old.object_id then changed := array_append(changed, 'объект'); end if;
  if cardinality(changed) > 0 then
    insert into public.task_status_history (task_id, task_title, event, from_status, to_status, changed_by, comment)
    values (new.id, new.title, 'edit', new.status, new.status, auth.uid(), array_to_string(changed, ', '));
  end if;
  return new;
end $$;
