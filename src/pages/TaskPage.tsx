import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TaskForm } from '../components/forms'
import { Empty, ErrorNote, Loading, Modal, StatusBadge } from '../components/ui'
import { useMe } from '../lib/auth'
import { availableActions, formatDate, STATUS_LABEL, type Action } from '../lib/status'
import { errorText, supabase, unwrap } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

export function TaskPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [commentFor, setCommentFor] = useState<Action | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const { data, error, reload } = useLoad(async () => {
    const [task, history] = await Promise.all([
      supabase
        .from('tasks')
        .select(
          '*, object:objects(id, name), assignee:profiles!tasks_assignee_id_fkey(full_name), author:profiles!tasks_author_id_fkey(full_name)',
        )
        .eq('id', id)
        .maybeSingle(),
      supabase.from('task_status_history').select('*, actor:profiles(full_name)').eq('task_id', id).order('created_at', { ascending: false }),
    ])
    return { task: unwrap(task), history: unwrap(history) ?? [] }
  }, [id])

  const run = async (action: Action, note?: string) => {
    setBusy(true)
    setActionError('')
    const { error } = await supabase.rpc('change_task_status', { p_task_id: id, p_to: action.to, p_comment: note })
    setBusy(false)
    if (error) return setActionError(errorText(error))
    setCommentFor(null)
    setComment('')
    reload()
  }
  const submitComment = (e: FormEvent) => {
    e.preventDefault()
    if (commentFor) run(commentFor, comment)
  }
  const remove = async () => {
    if (!confirm('Удалить задачу вместе с историей?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) setActionError(errorText(error))
    else navigate(data?.task?.object ? `/objects/${data.task.object.id}` : '/objects')
  }

  if (error) return <ErrorNote text={error} />
  if (!data) return <Loading />
  if (!data.task) return <Empty>Задача не найдена или у вас нет к ней доступа.</Empty>
  const { task, history } = data
  const actions = availableActions(task, me)

  return (
    <>
      <Link to={task.object ? `/objects/${task.object.id}` : '/objects'} className="back">
        ← {task.object?.name ?? 'Объекты'}
      </Link>

      <div className="task">
        <section className="task__main">
          <div className="page__head">
            <div>
              <p className="eyebrow">Задача</p>
              <h1>{task.title}</h1>
            </div>
            <StatusBadge status={task.status} />
          </div>

          <p className="task__desc">{task.description || <span className="muted">Без описания</span>}</p>

          <dl className="facts">
            <div>
              <dt>Объект</dt>
              <dd>{task.object?.name}</dd>
            </div>
            <div>
              <dt>Исполнитель</dt>
              <dd>{task.assignee?.full_name}</dd>
            </div>
            <div>
              <dt>Автор</dt>
              <dd>{task.author?.full_name}</dd>
            </div>
            <div>
              <dt>Создана</dt>
              <dd className="mono">{formatDate(task.created_at)}</dd>
            </div>
          </dl>

          {actions.length > 0 && (
            <div className="actions">
              <p className="actions__label">Доступные действия</p>
              <div className="btn-row">
                {actions.map((a) => (
                  <button
                    key={a.to}
                    className={`btn ${a.primary ? 'btn--primary' : 'btn--ghost'}`}
                    disabled={busy}
                    onClick={() => (a.needsComment ? setCommentFor(a) : run(a))}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ErrorNote text={actionError} />

          {me.role === 'manager' && (
            <div className="btn-row task__manage">
              <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
                Редактировать
              </button>
              <button className="btn btn--danger btn--sm" onClick={remove}>
                Удалить
              </button>
            </div>
          )}
        </section>

        <aside className="task__history">
          <h2 className="section-title">История</h2>
          <ol className="log">
            {history.map((h) => (
              <li key={h.id} className="log__item">
                <span className={`log__dot log__dot--${h.to_status}`} aria-hidden />
                <p className="log__move">
                  {h.from_status ? (
                    <>
                      {STATUS_LABEL[h.from_status]} <span className="log__arrow">→</span> <b>{STATUS_LABEL[h.to_status]}</b>
                    </>
                  ) : (
                    <b>Создана</b>
                  )}
                </p>
                <p className="log__meta">
                  {h.actor?.full_name} · <span className="mono">{formatDate(h.created_at)}</span>
                </p>
                {h.comment && <p className="log__comment">{h.comment}</p>}
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <Modal title="Редактировать задачу" open={editing} onClose={() => setEditing(false)}>
        <TaskForm
          task={task}
          onDone={() => {
            setEditing(false)
            reload()
          }}
        />
      </Modal>
      <Modal title="Вернуть на доработку" open={!!commentFor} onClose={() => setCommentFor(null)}>
        <form className="form" onSubmit={submitComment}>
          <label>
            Что нужно исправить
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} required autoFocus />
          </label>
          <ErrorNote text={actionError} />
          <div className="form__actions">
            <button className="btn btn--primary" disabled={busy || !comment.trim()}>
              Вернуть на доработку
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
