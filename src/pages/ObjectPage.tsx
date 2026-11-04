import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ObjectForm, TaskForm } from '../components/forms'
import { TaskTable } from '../components/TaskTable'
import { Empty, ErrorNote, Loading, Modal } from '../components/ui'
import { useMe } from '../lib/auth'
import { errorText, supabase, unwrap } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

export function ObjectPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const [modal, setModal] = useState<'edit' | 'task' | null>(null)
  const [actionError, setActionError] = useState('')
  const { data, error, reload } = useLoad(async () => {
    const [object, tasks] = await Promise.all([
      supabase.from('objects').select('*').eq('id', id).maybeSingle(),
      supabase.from('tasks').select('*, assignee:profiles!tasks_assignee_id_fkey(full_name)').eq('object_id', id).order('created_at'),
    ])
    return { object: unwrap(object), tasks: unwrap(tasks) ?? [] }
  }, [id])

  const remove = async () => {
    if (!confirm('Удалить объект?')) return
    const { error } = await supabase.from('objects').delete().eq('id', id)
    if (error) setActionError(errorText(error))
    else navigate('/objects')
  }
  const done = () => {
    setModal(null)
    reload()
  }

  if (error) return <ErrorNote text={error} />
  if (!data) return <Loading />
  if (!data.object) return <Empty>Объект не найден или у вас нет к нему доступа.</Empty>
  const { object, tasks } = data

  return (
    <>
      <Link to="/objects" className="back">
        ← Объекты
      </Link>
      <div className="page__head">
        <div>
          <p className="eyebrow">Объект</p>
          <h1>{object.name}</h1>
          <p className="page__sub">{object.address}</p>
        </div>
        {me.role === 'manager' && (
          <div className="btn-row">
            <button className="btn btn--ghost" onClick={() => setModal('edit')}>
              Изменить
            </button>
            <button className="btn btn--danger" onClick={remove}>
              Удалить
            </button>
            <button className="btn btn--primary" onClick={() => setModal('task')}>
              + Задача
            </button>
          </div>
        )}
      </div>
      <ErrorNote text={actionError} />

      <h2 className="section-title">
        Задачи <span className="count">{tasks.length}</span>
      </h2>
      {tasks.length ? <TaskTable tasks={tasks} columns={['assignee']} /> : <Empty>По объекту пока нет задач.</Empty>}

      <Modal title="Изменить объект" open={modal === 'edit'} onClose={() => setModal(null)}>
        <ObjectForm object={object} onDone={done} />
      </Modal>
      <Modal title="Новая задача" open={modal === 'task'} onClose={() => setModal(null)}>
        <TaskForm objectId={object.id} onDone={done} />
      </Modal>
    </>
  )
}
