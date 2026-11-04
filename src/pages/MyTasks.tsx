import { TaskTable } from '../components/TaskTable'
import { Empty, ErrorNote, Loading } from '../components/ui'
import { useMe } from '../lib/auth'
import { supabase, unwrap, type TaskStatus } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

// what needs the executor's attention first
const PRIORITY: Record<TaskStatus, number> = { rework: 0, new: 1, in_progress: 2, review: 3, accepted: 4 }

export function MyTasks() {
  const me = useMe()
  const { data, error } = useLoad(async () => {
    const rows = unwrap(await supabase.from('tasks').select('*, object:objects(name)').eq('assignee_id', me.id).order('created_at')) ?? []
    return rows.sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status])
  }, [me.id])

  const active = data?.filter((t) => t.status !== 'accepted') ?? []
  const done = data?.filter((t) => t.status === 'accepted') ?? []

  return (
    <>
      <div className="page__head">
        <div>
          <p className="eyebrow">{me.full_name}</p>
          <h1>Мои задачи</h1>
        </div>
      </div>
      <ErrorNote text={error} />
      {!data && !error && <Loading />}
      {data && (
        <>
          <h2 className="section-title">
            Активные <span className="count">{active.length}</span>
          </h2>
          {active.length ? <TaskTable tasks={active} columns={['object']} /> : <Empty>Активных задач нет.</Empty>}
          {done.length > 0 && (
            <>
              <h2 className="section-title">
                Принятые <span className="count">{done.length}</span>
              </h2>
              <TaskTable tasks={done} columns={['object']} />
            </>
          )}
        </>
      )}
    </>
  )
}
