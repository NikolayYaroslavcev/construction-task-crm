import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackLink, Empty, ErrorNote, LoadingBlock, PageHeader, SectionTitle } from '@/components/common'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { ObjectForm, TaskForm } from '@/components/forms'
import { TaskTable } from '@/components/TaskTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMe } from '@/lib/auth'
import { useDeleteObject, useObject, useTasks } from '@/lib/queries'

export function ObjectPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const [modal, setModal] = useState<'edit' | 'task' | null>(null)
  const object = useObject(id)
  const tasks = useTasks({ objectId: id })
  const remove = useDeleteObject()

  if (object.isPending) return <LoadingBlock />
  if (object.error) return <ErrorNote error={object.error} />
  if (!object.data) return <Empty>Объект не найден или у вас нет к нему доступа.</Empty>
  const o = object.data

  return (
    <>
      <BackLink to="/objects">Объекты</BackLink>
      <PageHeader
        eyebrow="Объект"
        title={o.name}
        sub={o.address}
        actions={
          me.role === 'manager' && (
            <>
              <Button variant="outline" size="lg" onClick={() => setModal('edit')}>
                <Pencil /> Изменить
              </Button>
              <ConfirmDelete
                title="Удалить объект?"
                description="Объект можно удалить, только если по нему нет задач."
                pending={remove.isPending}
                onConfirm={() => remove.mutate(o.id, { onSuccess: () => navigate('/objects') })}
              />
              <Button size="lg" onClick={() => setModal('task')}>
                <Plus /> Задача
              </Button>
            </>
          )
        }
      />

      <SectionTitle count={tasks.data?.length}>Задачи</SectionTitle>
      <ErrorNote error={tasks.error} />
      {tasks.isPending && <LoadingBlock />}
      {tasks.data &&
        (tasks.data.length ? (
          <div className="overflow-x-auto">
            <TaskTable tasks={tasks.data} columns={['assignee']} />
          </div>
        ) : (
          <Empty>По объекту пока нет задач.</Empty>
        ))}

      <Dialog open={!!modal} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{modal === 'edit' ? 'Изменить объект' : 'Новая задача'}</DialogTitle>
          </DialogHeader>
          {modal === 'edit' && <ObjectForm object={o} onDone={() => setModal(null)} />}
          {modal === 'task' && <TaskForm objectId={o.id} onDone={() => setModal(null)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
