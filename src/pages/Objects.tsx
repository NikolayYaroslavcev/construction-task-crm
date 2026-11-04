import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ObjectForm } from '../components/forms'
import { Empty, ErrorNote, Loading, Modal } from '../components/ui'
import { useMe } from '../lib/auth'
import { STATUS_LABEL } from '../lib/status'
import { supabase, unwrap, type TaskStatus } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

const ORDER: TaskStatus[] = ['new', 'in_progress', 'review', 'rework', 'accepted']

export function Objects() {
  const me = useMe()
  const [creating, setCreating] = useState(false)
  // for an executor RLS returns only their objects and only their tasks inside them
  const { data, error, reload } = useLoad(
    async () => unwrap(await supabase.from('objects').select('*, tasks(status)').order('created_at')),
    [],
  )

  return (
    <>
      <div className="page__head">
        <div>
          <p className="eyebrow">{me.role === 'manager' ? 'Все стройки' : 'Стройки, где у вас есть задачи'}</p>
          <h1>Объекты</h1>
        </div>
        {me.role === 'manager' && (
          <button className="btn btn--primary" onClick={() => setCreating(true)}>
            + Новый объект
          </button>
        )}
      </div>
      <ErrorNote text={error} />
      {!data && !error && <Loading />}
      {data && !data.length && <Empty>Объектов пока нет.</Empty>}
      <ul className="cards">
        {data?.map((o, i) => (
          <li key={o.id} style={{ animationDelay: `${i * 40}ms` }}>
            <Link to={`/objects/${o.id}`} className="card">
              <span className="card__index">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="card__title">{o.name}</h2>
              <p className="card__sub">{o.address}</p>
              <div className="tally">
                {ORDER.map((s) => {
                  const n = o.tasks.filter((t) => t.status === s).length
                  return n ? (
                    <span key={s} className={`tally__item tally__item--${s}`} title={STATUS_LABEL[s]}>
                      {STATUS_LABEL[s]} <b>{n}</b>
                    </span>
                  ) : null
                })}
                {!o.tasks.length && <span className="tally__none">нет задач</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Modal title="Новый объект" open={creating} onClose={() => setCreating(false)}>
        <ObjectForm onDone={() => {
            setCreating(false)
            reload()
          }} />
      </Modal>
    </>
  )
}
