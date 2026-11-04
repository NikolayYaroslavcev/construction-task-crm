import { describe, expect, it } from 'vitest'
import { availableActions } from './status'
import type { Profile, Task, TaskStatus } from './supabase'

const manager: Profile = { id: 'm', full_name: 'M', role: 'manager' }
const assignee: Profile = { id: 'a', full_name: 'A', role: 'executor' }
const other: Profile = { id: 'o', full_name: 'O', role: 'executor' }

const task = (status: TaskStatus): Task => ({
  id: 't',
  title: 'T',
  description: '',
  object_id: 'obj',
  assignee_id: assignee.id,
  author_id: manager.id,
  status,
  created_at: new Date().toISOString(),
})
const targets = (status: TaskStatus, who: Profile) => availableActions(task(status), who).map((a) => a.to)

// The same matrix as in the spec (and in change_task_status in the database).
describe('availableActions', () => {
  it('assigned executor: new -> in_progress, in_progress -> review, rework -> in_progress', () => {
    expect(targets('new', assignee)).toEqual(['in_progress'])
    expect(targets('in_progress', assignee)).toEqual(['review'])
    expect(targets('rework', assignee)).toEqual(['in_progress'])
    expect(targets('review', assignee)).toEqual([])
    expect(targets('accepted', assignee)).toEqual([])
  })

  it('manager: only review -> accepted / rework, rework needs a comment', () => {
    expect(targets('review', manager)).toEqual(['accepted', 'rework'])
    expect(availableActions(task('review'), manager).find((a) => a.to === 'rework')?.needsComment).toBe(true)
    for (const s of ['new', 'in_progress', 'rework', 'accepted'] as const) expect(targets(s, manager)).toEqual([])
  })

  it('another executor gets no actions in any status', () => {
    for (const s of ['new', 'in_progress', 'review', 'rework', 'accepted'] as const) expect(targets(s, other)).toEqual([])
  })
})
