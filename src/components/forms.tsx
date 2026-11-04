import { useState, type FormEvent } from 'react'
import { errorText, supabase, type Profile, type SiteObject, type Task } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import { ErrorNote } from './ui'

function useSubmit(action: () => PromiseLike<{ error: { code?: string; message: string } | null }>, onDone: () => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await action()
    setBusy(false)
    if (error) setError(errorText(error))
    else onDone()
  }
  return { busy, error, submit }
}

export function ObjectForm({ object, onDone }: { object?: SiteObject; onDone: () => void }) {
  const [name, setName] = useState(object?.name ?? '')
  const [address, setAddress] = useState(object?.address ?? '')
  const { busy, error, submit } = useSubmit(
    () => (object ? supabase.from('objects').update({ name, address }).eq('id', object.id) : supabase.from('objects').insert({ name, address })),
    onDone,
  )
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Название
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </label>
      <label>
        Адрес
        <input value={address} onChange={(e) => setAddress(e.target.value)} required />
      </label>
      <ErrorNote text={error} />
      <div className="form__actions">
        <button className="btn btn--primary" disabled={busy}>
          {object ? 'Сохранить' : 'Создать объект'}
        </button>
      </div>
    </form>
  )
}

export function TaskForm({ task, objectId, onDone }: { task?: Task; objectId?: string; onDone: () => void }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [object_id, setObjectId] = useState(task?.object_id ?? objectId ?? '')
  const [assignee_id, setAssigneeId] = useState(task?.assignee_id ?? '')
  const { data } = useLoad(async () => {
    const [objects, executors] = await Promise.all([
      supabase.from('objects').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'executor').order('full_name'),
    ])
    return { objects: (objects.data ?? []) as SiteObject[], executors: (executors.data ?? []) as Profile[] }
  }, [])
  const values = { title, description, object_id, assignee_id }
  const { busy, error, submit } = useSubmit(
    () => (task ? supabase.from('tasks').update(values).eq('id', task.id) : supabase.from('tasks').insert(values)),
    onDone,
  )

  return (
    <form className="form" onSubmit={submit}>
      <label>
        Название
        <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </label>
      <label>
        Описание
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </label>
      <div className="form__row">
        <label>
          Объект
          <select value={object_id} onChange={(e) => setObjectId(e.target.value)} required>
            <option value="" disabled>
              Выберите объект
            </option>
            {data?.objects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Исполнитель
          <select value={assignee_id} onChange={(e) => setAssigneeId(e.target.value)} required>
            <option value="" disabled>
              Выберите исполнителя
            </option>
            {data?.executors.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorNote text={error} />
      <div className="form__actions">
        <button className="btn btn--primary" disabled={busy}>
          {task ? 'Сохранить' : 'Создать задачу'}
        </button>
      </div>
    </form>
  )
}
