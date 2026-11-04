import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackLink, Empty, ErrorNote, LoadingBlock, StatusBadge } from '@/components/common'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { ReworkForm, TaskForm } from '@/components/forms'
import { History } from '@/components/History'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMe } from '@/lib/auth'
import { useChangeStatus, useDeleteTask, useHistory, useProfiles, useTask } from '@/lib/queries'
import { availableActions, formatDate } from '@/lib/status'

export function TaskPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const [modal, setModal] = useState<'edit' | 'rework' | null>(null)
  const task = useTask(id)
  const history = useHistory(id)
  const { data: profiles } = useProfiles()
  const change = useChangeStatus(id)
  const remove = useDeleteTask()

  if (task.isPending) return <LoadingBlock rows={4} />
  if (task.error) return <ErrorNote error={task.error} />
  if (!task.data) return <Empty>Задача не найдена или у вас нет к ней доступа.</Empty>
  const t = task.data
  const actions = availableActions(t, me)
  const back = t.object ? `/objects/${t.object.id}` : '/objects'

  const facts = [
    ['Объект', t.object?.name],
    ['Исполнитель', profiles?.byId.get(t.assignee_id)?.full_name],
    ['Автор', profiles?.byId.get(t.author_id)?.full_name],
    [
      'Создана',
      <span key="created" className="font-mono">
        {formatDate(t.created_at)}
      </span>,
    ],
  ] as const

  return (
    <>
      <BackLink to={back}>{t.object?.name ?? 'Объекты'}</BackLink>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="bg-card rounded-lg border p-5 sm:p-7">
          <p className="eyebrow mb-1.5">Задача</p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{t.title}</h1>
            <StatusBadge status={t.status} className="mt-1.5" />
          </div>

          <p className="text-foreground/85 mt-5 mb-6 whitespace-pre-wrap">
            {t.description || <span className="text-muted-foreground">Без описания</span>}
          </p>

          <dl className="mb-6 grid border-t sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label} className="border-b py-3">
                <dt className="eyebrow">{label}</dt>
                <dd className="mt-0.5 font-medium">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>

          {actions.length > 0 && (
            <div className="border-primary/25 bg-accent rounded-lg border p-4">
              <p className="text-accent-foreground mb-2.5 font-mono text-[11px] tracking-wider uppercase">Доступные действия</p>
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Button
                    key={a.to}
                    size="lg"
                    variant={a.primary ? 'default' : 'outline'}
                    disabled={change.isPending}
                    onClick={() => (a.needsComment ? setModal('rework') : change.mutate({ to: a.to }))}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {me.role === 'manager' && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-dashed pt-4">
              <Button variant="outline" size="lg" onClick={() => setModal('edit')}>
                <Pencil /> Редактировать
              </Button>
              <ConfirmDelete
                title="Удалить задачу?"
                description="Задача исчезнет из списков. Её история сохранится в журнале удалённых задач."
                pending={remove.isPending}
                onConfirm={() => remove.mutate(t.id, { onSuccess: () => navigate(back) })}
              />
            </div>
          )}
        </section>

        <aside>
          <h2 className="mb-3 text-base font-bold">История</h2>
          <ErrorNote error={history.error} />
          {history.isPending ? <LoadingBlock /> : <History entries={history.data ?? []} />}
        </aside>
      </div>

      <Dialog open={!!modal} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{modal === 'edit' ? 'Редактировать задачу' : 'Вернуть на доработку'}</DialogTitle>
            {modal === 'rework' && <DialogDescription>Комментарий увидит исполнитель, он сохранится в истории.</DialogDescription>}
          </DialogHeader>
          {modal === 'edit' && <TaskForm task={t} onDone={() => setModal(null)} />}
          {modal === 'rework' && (
            <ReworkForm
              pending={change.isPending}
              onSubmit={(comment) => change.mutate({ to: 'rework', comment }, { onSuccess: () => setModal(null) })}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
