import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

type Tables = Database['public']['Tables']
export type Profile = Tables['profiles']['Row']
export type SiteObject = Tables['objects']['Row']
export type Task = Tables['tasks']['Row']
export type HistoryEntry = Tables['task_status_history']['Row']
export type TaskStatus = Database['public']['Enums']['task_status']

/** Returns data or throws a readable error; used inside loaders. */
export function unwrap<T>({ data, error }: { data: T; error: { code?: string; message: string } | null }): T {
  if (error) throw new Error(errorText(error))
  return data
}

// Turns database/API errors into messages a user can act on.
export function errorText(e: { code?: string; message: string } | null | undefined): string {
  if (!e) return ''
  if (e.code === '23503') return 'Нельзя удалить: на объекте есть задачи. Сначала удалите или перенесите их.'
  if (e.message.includes('comment is required')) return 'Укажите комментарий: что нужно доработать.'
  if (e.message.includes('is not allowed')) return 'Это действие недоступно в текущем статусе задачи.'
  if (e.message.includes('Task not found')) return 'Задача не найдена или нет доступа.'
  if (e.message.includes('Assignee must be an executor')) return 'Исполнителем может быть только пользователь с ролью «исполнитель».'
  if (e.message.includes('Invalid login credentials')) return 'Неверный email или пароль.'
  return e.message
}
