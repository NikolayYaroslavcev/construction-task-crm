import { Empty, ErrorNote, LoadingBlock, PageHeader, SectionTitle } from '@/components/common'
import { TaskTable } from '@/components/TaskTable'
import { useMe } from '@/lib/auth'
import { useTasks } from '@/lib/queries'
import type { TaskStatus } from '@/lib/supabase'

// what needs the executor's attention first
const PRIORITY: Record<TaskStatus, number> = { rework: 0, new: 1, in_progress: 2, review: 3, accepted: 4 }

export function MyTasks() {
  const me = useMe()
  const { data, error, isPending } = useTasks({ assigneeId: me.id })
  const sorted = [...(data ?? [])].sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status])
  const active = sorted.filter((t) => t.status !== 'accepted')
  const done = sorted.filter((t) => t.status === 'accepted')

  return (
    <>
      <PageHeader eyebrow={me.full_name} title="Мои задачи" sub="Сначала то, что ждёт ваших действий" />
      <ErrorNote error={error} />
      {isPending && <LoadingBlock />}
      {data && (
        <>
          <SectionTitle count={active.length}>Активные</SectionTitle>
          {active.length ? (
            <div className="overflow-x-auto">
              <TaskTable tasks={active} columns={['object']} />
            </div>
          ) : (
            <Empty>Активных задач нет.</Empty>
          )}
          {done.length > 0 && (
            <>
              <SectionTitle count={done.length}>Принятые</SectionTitle>
              <div className="overflow-x-auto">
                <TaskTable tasks={done} columns={['object']} />
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
