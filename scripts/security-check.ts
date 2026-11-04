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

await check('role helper is not reachable through the API', async () => {
  const { error } = await w1.db.rpc('is_manager')
  return !!error
})

console.log('— Allowed path end to end')
const manager2 = await signIn('MANAGER2')
const cycleTitle = `cycle test ${Date.now()}`
const { data: cycle } = await manager.db
  .from('tasks')
  .insert({ title: cycleTitle, object_id: w1Task.object_id, assignee_id: w1.id })
  .select()
  .single()
const step = (who: typeof w1, to: string, comment?: string) =>
  who.db.rpc('change_task_status', { p_task_id: cycle!.id, p_to: to, p_comment: comment })
await check('executor: new -> in_progress -> review', async () => {
  return !(await step(w1, 'in_progress')).error && !(await step(w1, 'review')).error
})
await check('second manager: review -> rework with a comment', async () => !(await step(manager2, 'rework', 'Переделать')).error)
await check('executor: rework -> in_progress -> review', async () => {
  return !(await step(w1, 'in_progress')).error && !(await step(w1, 'review')).error
})
await check('manager: review -> accepted', async () => !(await step(manager, 'accepted')).error)
await check('accepted is final: no way back', async () => {
  const a = await step(w1, 'in_progress')
  const b = await step(manager, 'rework', 'ещё раз')
  return !!a.error && !!b.error
})
await check('history has every step with the right actor and comment', async () => {
  const { data } = await w1.db.from('task_status_history').select('*').eq('task_id', cycle!.id).order('id')
  const moves = data!.map((h) => `${h.from_status ?? '-'}>${h.to_status}`).join(' ')
  const rework = data!.find((h) => h.to_status === 'rework')
  return (
    moves === '->new new>in_progress in_progress>review review>rework rework>in_progress in_progress>review review>accepted' &&
    rework?.changed_by === manager2.id &&
    rework?.comment === 'Переделать' &&
    data![0].changed_by === manager.id
  )
})
await check('history survives task deletion (audit log, managers only)', async () => {
  await manager.db.from('tasks').delete().eq('id', cycle!.id)
  const { data: kept } = await manager.db.from('task_status_history').select('*').is('task_id', null).eq('task_title', cycleTitle)
  const { data: hidden } = await w1.db.from('task_status_history').select('*').is('task_id', null)
  return kept?.length === 7 && hidden?.length === 0
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
