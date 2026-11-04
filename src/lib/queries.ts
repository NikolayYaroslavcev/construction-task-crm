import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import type { EmployeeValues, ObjectValues, TaskValues } from './schemas'
import { errorText, supabase, unwrap, type HistoryEntry, type TaskStatus } from './supabase'

// Every read goes through RLS: the same hook returns "everything" for a manager
// and only own data for an executor.

const TASK_WITH_OBJECT = '*, object:objects(id, name)'

export const keys = {
  objects: ['objects'] as const,
  object: (id: string) => ['objects', id] as const,
  tasks: (filter: { objectId?: string; assigneeId?: string } = {}) => ['tasks', filter] as const,
  task: (id: string) => ['task', id] as const,
  history: (taskId: string) => ['history', taskId] as const,
  deleted: ['history', 'deleted'] as const,
  profiles: ['profiles'] as const,
}

export const useProfiles = () =>
  useQuery({
    queryKey: keys.profiles,
    queryFn: async () => unwrap(await supabase.from('profiles').select('*').order('full_name')) ?? [],
    select: (rows) => ({ list: rows, byId: new Map(rows.map((p) => [p.id, p])) }),
  })

export const useObjects = () =>
  useQuery({
    queryKey: keys.objects,
    queryFn: async () => unwrap(await supabase.from('objects').select('*, tasks(status)').order('created_at')) ?? [],
  })

export const useObject = (id: string) =>
  useQuery({
    queryKey: keys.object(id),
    queryFn: async () => unwrap(await supabase.from('objects').select('*').eq('id', id).maybeSingle()),
  })

export const useTasks = (filter: { objectId?: string; assigneeId?: string } = {}) =>
  useQuery({
    queryKey: keys.tasks(filter),
    queryFn: async () => {
      let q = supabase.from('tasks').select(TASK_WITH_OBJECT).order('created_at', { ascending: false })
      if (filter.objectId) q = q.eq('object_id', filter.objectId)
      if (filter.assigneeId) q = q.eq('assignee_id', filter.assigneeId)
      return unwrap(await q) ?? []
    },
  })

export const useTask = (id: string) =>
  useQuery({
    queryKey: keys.task(id),
    queryFn: async () => unwrap(await supabase.from('tasks').select(TASK_WITH_OBJECT).eq('id', id).maybeSingle()),
  })

export const useHistory = (taskId: string) =>
  useQuery({
    queryKey: keys.history(taskId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('task_status_history')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false }),
      ) ?? [],
  })

/** Audit log of deleted tasks (managers only, enforced by RLS). */
export const useDeletedLog = () =>
  useQuery({
    queryKey: keys.deleted,
    queryFn: async () => {
      // the view returns only rows of deleted tasks, and RLS lets only managers read them
      const rows = (unwrap(
        await supabase.from('deleted_task_history').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }),
      ) ?? []) as HistoryEntry[]
      const groups = new Map<string, HistoryEntry[]>()
      for (const h of rows) groups.set(h.task_id, [...(groups.get(h.task_id) ?? []), h])
      return [...groups.entries()].map(([taskId, entries]) => ({ taskId, title: entries[0].task_title, entries }))
    },
  })

// ---------------------------------------------------------------- mutations

function useInvalidateAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}

const onError = (e: Error) => toast.error(e.message)

export function useChangeStatus(taskId: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async ({ to, comment }: { to: TaskStatus; comment?: string }) =>
      unwrap(await supabase.rpc('change_task_status', { p_task_id: taskId, p_to: to, p_comment: comment })),
    onSuccess: invalidate,
    onError,
  })
}

export function useSaveObject(id?: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async (values: ObjectValues) =>
      unwrap(id ? await supabase.from('objects').update(values).eq('id', id) : await supabase.from('objects').insert(values)),
    onSuccess: () => {
      toast.success(id ? 'Объект сохранён' : 'Объект создан')
      invalidate()
    },
    onError,
  })
}

export function useDeleteObject() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('objects').delete().eq('id', id)),
    onSuccess: () => {
      toast.success('Объект удалён')
      invalidate()
    },
    onError,
  })
}

export function useSaveTask(id?: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async (values: TaskValues) =>
      unwrap(id ? await supabase.from('tasks').update(values).eq('id', id) : await supabase.from('tasks').insert(values)),
    onSuccess: () => {
      toast.success(id ? 'Задача сохранена' : 'Задача создана')
      invalidate()
    },
    onError,
  })
}

export function useDeleteTask() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('tasks').delete().eq('id', id)),
    onSuccess: () => {
      toast.success('Задача удалена, история сохранена в журнале')
      invalidate()
    },
    onError,
  })
}

export function useCreateEmployee() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async (values: EmployeeValues) => {
      const { data, error } = await supabase.functions.invoke('create-user', { body: values })
      if (error) {
        // the function returns { error } with a status code; surface its text
        const body = await (error as { context?: Response }).context?.json().catch(() => null)
        throw new Error(errorText({ message: body?.error ?? error.message }))
      }
      return data
    },
    onSuccess: () => {
      toast.success('Сотрудник добавлен')
      invalidate()
    },
    onError,
  })
}

// ---------------------------------------------------------------- realtime

/** Live updates: any change in tasks, objects or history refreshes open screens. RLS applies to events too. */
export function useRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => qc.invalidateQueries(), 150)
    }
    const channel = supabase
      .channel('crm-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'objects' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_status_history' }, refresh)
      .subscribe()
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [qc])
}
