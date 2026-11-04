// Tries forbidden actions straight against the Supabase API (no UI) and checks that the database blocks them.
// Run after `npm run seed`: npm run security-check
import { anon, signIn } from './lib.ts'

const manager = await signIn('MANAGER')
const w1 = await signIn('WORKER1')
const w2 = await signIn('WORKER2')

// ground truth, read as manager
const { data: all } = await manager.db.from('tasks').select('*')
if (!all?.length) throw new Error('No tasks, run `npm run seed` first')
const w1Task = all.find((t) => t.assignee_id === w1.id && t.status === 'new')!
const w2Task = all.find((t) => t.assignee_id === w2.id)!
const reviewTask = all.find((t) => t.status === 'review')!
const historyCount = async () =>
  (await manager.db.from('task_status_history').select('*', { count: 'exact', head: true })).count

let failed = 0
async function check(name: string, ok: () => Promise<boolean>) {
  let pass = false
  try {
    pass = await ok()
  } catch (e) {
    console.error(`  ${name}: ${e}`)
  }
  if (!pass) failed++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`)
}

console.log('— Executor (worker1)')
await check('sees only own tasks', async () => {
  const { data } = await w1.db.from('tasks').select('*')
  return !!data?.length && data.every((t) => t.assignee_id === w1.id)
})
await check("cannot read another executor's task by id", async () => {
  const { data } = await w1.db.from('tasks').select('*').eq('id', w2Task.id)
  return data?.length === 0
})
await check("cannot read another executor's task history", async () => {
  const { data } = await w1.db.from('task_status_history').select('*').eq('task_id', w2Task.id)
  return data?.length === 0
})
await check('sees only objects where they have tasks', async () => {
  const { data } = await w1.db.from('objects').select('id')
  const own = new Set(all.filter((t) => t.assignee_id === w1.id).map((t) => t.object_id))
  return !!data?.length && data.every((o) => own.has(o.id)) && data.length === own.size
})
await check('cannot edit task fields', async () => {
  await w1.db.from('tasks').update({ title: 'hacked' }).eq('id', w1Task.id)
  const { data } = await manager.db.from('tasks').select('title').eq('id', w1Task.id).single()
  return data!.title === w1Task.title
})
await check('cannot set status directly (bypassing transition rules)', async () => {
  const { error } = await w1.db.from('tasks').update({ status: 'accepted' }).eq('id', w1Task.id)
  return !!error
})
await check('cannot accept own task (new -> accepted)', async () => {
  const { error } = await w1.db.rpc('change_task_status', { p_task_id: w1Task.id, p_to: 'accepted' })
  return !!error
})
await check("cannot change status of another executor's task", async () => {
  const { error } = await w1.db.rpc('change_task_status', { p_task_id: w2Task.id, p_to: 'in_progress' })
  return !!error
})
await check('cannot insert history records', async () => {
  const { error } = await w1.db
    .from('task_status_history')
    .insert({ task_id: w1Task.id, from_status: 'review', to_status: 'accepted', changed_by: manager.id })
  return !!error
})
await check('cannot edit or delete history', async () => {
  const before = await historyCount()
  const upd = await w1.db.from('task_status_history').update({ comment: 'fake' }).eq('task_id', w1Task.id)
  const del = await w1.db.from('task_status_history').delete().eq('task_id', w1Task.id)
  return !!upd.error && !!del.error && (await historyCount()) === before
})
await check('cannot create objects or tasks', async () => {
  const o = await w1.db.from('objects').insert({ name: 'x', address: 'x' })
  const t = await w1.db.from('tasks').insert({ title: 'x', object_id: w1Task.object_id, assignee_id: w1.id })
  return !!o.error && !!t.error
})
await check('cannot promote self to manager', async () => {
  await w1.db.from('profiles').update({ role: 'manager' }).eq('id', w1.id)
  const { data } = await manager.db.from('profiles').select('role').eq('id', w1.id).single()
  return data!.role === 'executor'
})

console.log('— Manager')
await check('cannot return for rework without a comment', async () => {
  const { error } = await manager.db.rpc('change_task_status', { p_task_id: reviewTask.id, p_to: 'rework', p_comment: '  ' })
  return !!error
})
await check("cannot do the executor's transition (new -> in_progress)", async () => {
  const { error } = await manager.db.rpc('change_task_status', { p_task_id: w1Task.id, p_to: 'in_progress' })
  return !!error
})
await check('cannot set status directly', async () => {
  const { error } = await manager.db.from('tasks').update({ status: 'accepted' }).eq('id', w1Task.id)
  return !!error
})
await check('cannot forge status / author on create', async () => {
  const { data, error } = await manager.db
    .from('tasks')
    .insert({ title: 'forge test', object_id: w1Task.object_id, assignee_id: w1.id, status: 'accepted', author_id: w1.id })
    .select()
    .single()
  if (error) return true
  await manager.db.from('tasks').delete().eq('id', data.id)
  return data.status === 'new' && data.author_id === manager.id
})
await check('cannot assign a task to a non-executor', async () => {
  const { error } = await manager.db.from('tasks').update({ assignee_id: manager.id }).eq('id', w1Task.id)
  return !!error
})

console.log('— Anonymous')
await check('cannot sign up', async () => {
  const { error } = await anon().auth.signUp({ email: `intruder${Date.now()}@test.ru`, password: 'Intruder-2026!' })
  return !!error
})
await check('cannot read any data', async () => {
  const db = anon()
  const results = await Promise.all(['objects', 'tasks', 'task_status_history', 'profiles'].map((t) => db.from(t).select('*')))
  return results.every((r) => !!r.error || r.data?.length === 0)
})

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
