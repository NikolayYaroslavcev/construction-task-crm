import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Empty, ErrorNote, LoadingBlock, PageHeader } from '@/components/common'
import { STATUS_TEXT } from '@/lib/statusStyles'
import { History } from '@/components/History'
import { TaskTable } from '@/components/TaskTable'
import { Input } from '@/components/ui/input'
import { useDeletedLog, useProfiles, useTasks } from '@/lib/queries'
import { STATUS_LABEL } from '@/lib/status'
import type { TaskStatus } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const FILTERS: TaskStatus[] = ['review', 'new', 'in_progress', 'rework', 'accepted']
type Tab = TaskStatus | 'all' | 'deleted'

const chip = (on: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    on && 'border-ink bg-ink text-white hover:border-ink',
  )

// Manager overview across all objects; review comes first because it waits for the manager.
export function AllTasks() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('status') ?? 'all') as Tab
  const q = params.get('q') ?? ''
  const tasks = useTasks()
  const deleted = useDeletedLog()
  const { data: profiles } = useProfiles()

  const set = (next: Partial<{ status: Tab; q: string }>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== 'all') p.set(k, v)
      else p.delete(k)
    }
    setParams(p, { replace: true })
  }
  const needle = q.trim().toLowerCase()
  const matches = (t: NonNullable<typeof tasks.data>[number]) =>
    !needle ||
    [t.title, t.description, t.object?.name, profiles?.byId.get(t.assignee_id)?.full_name].some((s) => s?.toLowerCase().includes(needle))
  const searched = (tasks.data ?? []).filter(matches)
  const rows = tab === 'all' ? searched : searched.filter((t) => t.status === tab)
  const deletedRows = (deleted.data ?? []).filter((d) => !needle || d.title.toLowerCase().includes(needle))

  return (
    <>
      <PageHeader eyebrow="По всем объектам" title="Все задачи" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:mr-2 sm:w-64">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Поиск по задачам"
            className="bg-card h-9 pl-8"
            aria-label="Поиск"
          />
        </div>
        <button className={chip(tab === 'all')} onClick={() => set({ status: 'all' })}>
          Все <b className="font-mono">{searched.length}</b>
        </button>
        {FILTERS.map((s) => (
          <button key={s} className={chip(tab === s)} onClick={() => set({ status: s })}>
            {STATUS_LABEL[s]}{' '}
            <b className={cn('font-mono', tab === s ? 'text-primary' : STATUS_TEXT[s])}>{searched.filter((t) => t.status === s).length}</b>
          </button>
        ))}
        <button className={chip(tab === 'deleted')} onClick={() => set({ status: 'deleted' })}>
          Удалённые <b className="font-mono">{deletedRows.length}</b>
        </button>
      </div>

      {tab === 'deleted' ? (
        <>
          <ErrorNote error={deleted.error} />
          {deleted.isPending && <LoadingBlock />}
          {deleted.data && !deletedRows.length && <Empty>Удалённых задач нет.</Empty>}
          <div className="grid gap-4 md:grid-cols-2">
            {deletedRows.map((d) => (
              <section key={d.taskId} className="bg-card rounded-lg border p-5">
                <p className="eyebrow mb-1">Удалённая задача</p>
                <h2 className="mb-4 text-base font-bold">{d.title}</h2>
                <History entries={d.entries} />
              </section>
            ))}
          </div>
        </>
      ) : (
        <>
          <ErrorNote error={tasks.error} />
          {tasks.isPending && <LoadingBlock />}
          {tasks.data &&
            (rows.length ? (
              <div className="overflow-x-auto">
                <TaskTable tasks={rows} columns={['object', 'assignee']} />
              </div>
            ) : (
              <Empty>{needle ? 'Ничего не найдено.' : 'Задач в этом статусе нет.'}</Empty>
            ))}
        </>
      )}
    </>
  )
}
