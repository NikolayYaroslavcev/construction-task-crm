// Demo data through the public API, signed in as real users, so the status history is genuine.
// Run once: npm run seed
import { signIn } from './lib.ts'

const manager = await signIn('MANAGER')
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
const tasks: { object: string; title: string; description: string; who: 'w1' | 'w2'; path: Step[] }[] = [
  { object: north.id, title: 'Залить фундамент', description: 'Бетон М300, по проекту секции А.', who: 'w1', path: ['in_progress', 'review', 'accepted'] },
  { object: north.id, title: 'Монтаж опалубки 2 этажа', description: 'Щитовая опалубка, проверить отметки.', who: 'w1', path: ['in_progress', 'review'] },
  { object: north.id, title: 'Армирование перекрытия', description: 'Сетка 200×200, арматура А500 Ø12.', who: 'w2', path: ['in_progress'] },
  { object: cottage.id, title: 'Кладка стен 1 этажа', description: 'Газобетон D500, клей, армирование каждого 4-го ряда.', who: 'w2', path: ['in_progress', 'review', 'rework'] },
  { object: cottage.id, title: 'Установка окон', description: '6 окон ПВХ, монтаж по ГОСТ.', who: 'w1', path: [] },
  { object: warehouse.id, title: 'Устройство кровли', description: 'Профлист С44, утеплитель 150 мм.', who: 'w2', path: ['in_progress', 'review'] },
  { object: warehouse.id, title: 'Электрика: разводка', description: 'Освещение и розетки по схеме ЭМ-1.', who: 'w2', path: [] },
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
    const actor = to === 'accepted' || to === 'rework' ? manager : assignee
    const comment = to === 'rework' ? 'Нарушена перевязка швов в углах, переложить 3 ряда.' : null
    const { error } = await actor.db.rpc('change_task_status', { p_task_id: task.id, p_to: to, p_comment: comment })
    if (error) throw new Error(`${t.title} -> ${to}: ${error.message}`)
  }
  console.log(`+ ${t.title} (${t.path.at(-1) ?? 'new'})`)
}
