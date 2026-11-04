import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabase = createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

type Tables = Database['public']['Tables']
export type Profile = Tables['profiles']['Row']
export type SiteObject = Tables['objects']['Row']
export type Task = Tables['tasks']['Row']
export type HistoryEntry = Tables['task_status_history']['Row']
export type TaskStatus = Database['public']['Enums']['task_status']
export type UserRole = Database['public']['Enums']['user_role']

type DbError = { code?: string; message: string }

/** Returns data or throws a readable error; used inside query functions and mutations. */
export function unwrap<T>({ data, error }: { data: T; error: DbError | null }): T {
  if (error) throw new Error(errorText(error))
  return data
}

// Turns database/API errors into messages a user can act on.
export function errorText(e: DbError): string {
  const m = e.message
  if (e.code === '23503') return 'Нельзя удалить: на объекте есть задачи. Сначала удалите или перенесите их.'
  if (m.includes('comment is required')) return 'Укажите комментарий: что нужно доработать.'
  if (m.includes('is not allowed')) return 'Это действие недоступно в текущем статусе задачи. Обновите страницу.'
  if (m.includes('Task not found')) return 'Задача не найдена или нет доступа.'
  if (m.includes('Assignee must be an executor')) return 'Исполнителем может быть только сотрудник с ролью «исполнитель».'
  if (m.includes('Invalid login credentials')) return 'Неверный email или пароль.'
  if (m.includes('already been registered')) return 'Сотрудник с таким email уже есть.'
  if (m.includes('Failed to fetch')) return 'Нет связи с сервером. Проверьте интернет и повторите.'
  return m
}
