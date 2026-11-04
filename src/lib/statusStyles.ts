import type { TaskStatus } from './supabase'

// Literal class names so Tailwind can see them.
export const STATUS_TEXT: Record<TaskStatus, string> = {
  new: 'text-st-new',
  in_progress: 'text-st-in_progress',
  review: 'text-st-review',
  accepted: 'text-st-accepted',
  rework: 'text-st-rework',
}
export const STATUS_CHIP: Record<TaskStatus, string> = {
  new: 'text-st-new bg-st-new/10 border-st-new/30',
  in_progress: 'text-st-in_progress bg-st-in_progress/10 border-st-in_progress/30',
  review: 'text-st-review bg-st-review/10 border-st-review/30',
  accepted: 'text-st-accepted bg-st-accepted/10 border-st-accepted/30',
  rework: 'text-st-rework bg-st-rework/10 border-st-rework/30',
}
export const STATUS_DOT: Record<TaskStatus, string> = {
  new: 'bg-st-new',
  in_progress: 'bg-st-in_progress',
  review: 'bg-st-review',
  accepted: 'bg-st-accepted',
  rework: 'bg-st-rework',
}

export const STATUS_BORDER: Record<TaskStatus, string> = {
  new: 'border-st-new',
  in_progress: 'border-st-in_progress',
  review: 'border-st-review',
  accepted: 'border-st-accepted',
  rework: 'border-st-rework',
}
