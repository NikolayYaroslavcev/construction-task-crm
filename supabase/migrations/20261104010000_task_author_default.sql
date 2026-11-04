-- The author is set by the trigger anyway; the default lets clients omit the column on insert.
alter table public.tasks alter column author_id set default auth.uid();
