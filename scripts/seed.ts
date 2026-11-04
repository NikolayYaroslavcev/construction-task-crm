// Demo data through the public API, signed in as real users, so the status history is genuine.
// Run once: npm run seed
import { signIn } from './lib.ts'

const manager = await signIn('MANAGER')
const manager2 = await signIn('MANAGER2')
const w1 = await signIn('WORKER1')
const w2 = await signIn('WORKER2')
const workers = { w1, w2 }

const { count } = await manager.db.from('objects').select('*', { count: 'exact', head: true })
if (count) {
  console.log(`Already seeded (${count} objects), nothing to do`)
  process.exit(0)
}

const { data: objects, error } = await manager.db
  .from('objects')
  .insert([
    { name: 'ЖК «Северный»', address: 'ул. Ленина, 12' },
    { name: 'Коттедж в пос. Лесной', address: 'пос. Лесной, уч. 45' },
    { name: 'Склад «Логистик»', address: 'Промзона, стр. 3' },
  ])
  .select()
if (error) throw error
const [north, cottage, warehouse] = objects

type Step = 'in_progress' | 'review' | 'accepted' | 'rework'
const tasks: { object: string; title: string; description: string; who: 'w1' | 'w2'; path: Step[]; reviewer?: 'manager2' }[] = [
  {
    object: north.id,
    title: 'Залить фундамент',
    description: 'Бетон М300, по проекту секции А.',
    who: 'w1',
    path: ['in_progress', 'review', 'accepted'],
  },
  {
    object: north.id,
    title: 'Монтаж опалубки 2 этажа',
    description: 'Щитовая опалубка, проверить отметки.',
    who: 'w1',
    path: ['in_progress', 'review'],
  },
  { object: north.id, title: 'Армирование перекрытия', description: 'Сетка 200×200, арматура А500 Ø12.', who: 'w2', path: ['in_progress'] },
  {
    object: cottage.id,
    title: 'Кладка стен 1 этажа',
    description: 'Газобетон D500, клей, армирование каждого 4-го ряда.',
    who: 'w2',
    path: ['in_progress', 'review', 'rework'],
  },
  { object: cottage.id, title: 'Установка окон', description: '6 окон ПВХ, монтаж по ГОСТ.', who: 'w1', path: [] },
  {
    object: cottage.id,
    title: 'Гидроизоляция фундамента',
    description: 'Обмазочная гидроизоляция в 2 слоя, фото каждого участка.',
    who: 'w2',
    path: ['in_progress', 'review'],
  },
  {
    object: warehouse.id,
    title: 'Устройство кровли',
    description: 'Профлист С44, утеплитель 150 мм.',
    who: 'w2',
    path: ['in_progress', 'review', 'accepted'],
    reviewer: 'manager2',
  },
  { object: warehouse.id, title: 'Электрика: разводка', description: 'Освещение и розетки по схеме ЭМ-1.', who: 'w1', path: [] },
]

for (const t of tasks) {
  const assignee = workers[t.who]
  const { data: task, error } = await manager.db
    .from('tasks')
    .insert({ title: t.title, description: t.description, object_id: t.object, assignee_id: assignee.id })
    .select()
    .single()
  if (error) throw error

  for (const to of t.path) {
    const reviewer = t.reviewer === 'manager2' ? manager2 : manager
    const actor = to === 'accepted' || to === 'rework' ? reviewer : assignee
    const comment = to === 'rework' ? 'Нарушена перевязка швов в углах, переложить 3 ряда.' : null
    const { error } = await actor.db.rpc('change_task_status', { p_task_id: task.id, p_to: to, p_comment: comment })
    if (error) throw new Error(`${t.title} -> ${to}: ${error.message}`)
  }
  console.log(`+ ${t.title} (${t.path.at(-1) ?? 'new'})`)
}

// Reassignment and an edit, so the history shows more than status changes.
const { data: electrics } = await manager2.db.from('tasks').select('id').eq('title', 'Электрика: разводка').single()
const { error: reassignError } = await manager2.db
  .from('tasks')
  .update({ assignee_id: w2.id, description: 'Освещение и розетки по схеме ЭМ-1, щит ЩР-2.' })
  .eq('id', electrics!.id)
if (reassignError) throw reassignError
console.log('~ Электрика: разводка (reassigned to worker2)')

// A deleted task: its history stays in the audit log ("Все задачи" -> "Удалённые").
const { data: fence, error: fenceError } = await manager.db
  .from('tasks')
  .insert({
    title: 'Временное ограждение площадки',
    description: 'Профлист 2 м по периметру.',
    object_id: warehouse.id,
    assignee_id: w1.id,
  })
  .select()
  .single()
if (fenceError) throw fenceError
await w1.db.rpc('change_task_status', { p_task_id: fence.id, p_to: 'in_progress' })
const { error: deleteError } = await manager.db.from('tasks').delete().eq('id', fence.id)
if (deleteError) throw deleteError
console.log('- Временное ограждение площадки (deleted, history kept)')
