import { useSearchParams } from 'react-router-dom'
import { TaskTable } from '../components/TaskTable'
import { Empty, ErrorNote, Loading } from '../components/ui'
import { STATUS_LABEL } from '../lib/status'
import { supabase, unwrap, type TaskStatus } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

const FILTERS: TaskStatus[] = ['review', 'new', 'in_progress', 'rework', 'accepted']

// Manager overview across all objects; review comes first because it waits for the manager.
export function AllTasks() {
  const [params, setParams] = useSearchParams()
  const filter = params.get('status') as TaskStatus | null
  const { data, error } = useLoad(
    async () =>
      unwrap(
        await supabase
          .from('tasks')
          .select('*, object:objects(name), assignee:profiles!tasks_assignee_id_fkey(full_name)')
          .order('created_at', { ascending: false }),
      ) ?? [],
    [],
  )
  const count = (s: TaskStatus) => data?.filter((t) => t.status === s).length ?? 0
  const rows = data?.filter((t) => !filter || t.status === filter) ?? []

  return (
    <>
      <div className="page__head">
        <div>
          <p className="eyebrow">По всем объектам</p>
          <h1>Все задачи</h1>
        </div>
      </div>
      <div className="filters" role="tablist">
        <button className={`chip ${!filter ? 'chip--on' : ''}`} onClick={() => setParams({})}>
          Все <b>{data?.length ?? 0}</b>
        </button>
        {FILTERS.map((s) => (
          <button key={s} className={`chip chip--${s} ${filter === s ? 'chip--on' : ''}`} onClick={() => setParams({ status: s })}>
            {STATUS_LABEL[s]} <b>{count(s)}</b>
          </button>
        ))}
      </div>
      <ErrorNote text={error} />
      {!data && !error && <Loading />}
      {data && (rows.length ? <TaskTable tasks={rows} columns={['object', 'assignee']} /> : <Empty>Задач в этом статусе нет.</Empty>)}
    </>
  )
}
