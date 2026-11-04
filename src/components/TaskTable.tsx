import { Link } from 'react-router-dom'
import { formatDate } from '../lib/status'
import type { Task } from '../lib/supabase'
import { StatusBadge } from './ui'

type Row = Task & { assignee?: { full_name: string } | null; object?: { name: string } | null }
type Column = 'object' | 'assignee'

const HEAD: Record<Column, string> = { object: 'Объект', assignee: 'Исполнитель' }

export function TaskTable({ tasks, columns }: { tasks: Row[]; columns: Column[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="table__title">Задача</th>
            {columns.map((c) => (
              <th key={c}>{HEAD[c]}</th>
            ))}
            <th className="table__status">Статус</th>
            <th className="table__date">Создана</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>
                <Link to={`/tasks/${t.id}`} className="table__link">
                  {t.title}
                </Link>
              </td>
              {columns.map((c) => (
                <td key={c}>{c === 'object' ? t.object?.name : t.assignee?.full_name}</td>
              ))}
              <td>
                <StatusBadge status={t.status} />
              </td>
              <td className="table__date mono">{formatDate(t.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
