import type { Profile, Task, TaskStatus } from './supabase'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
}

export type Action = { to: TaskStatus; label: string; needsComment?: boolean; primary?: boolean }

// UI mirror of the transition matrix. It only decides which buttons to show;
// the database (change_task_status) is what actually enforces the rules.
export function availableActions(task: Task, me: Profile): Action[] {
  const isAssignee = task.assignee_id === me.id
  const isManager = me.role === 'manager'
  switch (task.status) {
    case 'new':
      return isAssignee ? [{ to: 'in_progress', label: 'Взять в работу', primary: true }] : []
    case 'in_progress':
      return isAssignee ? [{ to: 'review', label: 'Отправить на проверку', primary: true }] : []
    case 'review':
      return isManager
        ? [
            { to: 'accepted', label: 'Принять', primary: true },
            { to: 'rework', label: 'Вернуть на доработку', needsComment: true },
          ]
        : []
    case 'rework':
      return isAssignee ? [{ to: 'in_progress', label: 'Взять в работу', primary: true }] : []
    default:
      return []
  }
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
