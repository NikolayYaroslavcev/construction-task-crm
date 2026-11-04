import { Link, useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useProfiles } from '@/lib/queries'
import { formatDate } from '@/lib/status'
import type { Task } from '@/lib/supabase'
import { StatusBadge } from './common'

type Row = Task & { object?: { id: string; name: string } | null }
type Column = 'object' | 'assignee'

const HEAD: Record<Column, string> = { object: 'Объект', assignee: 'Исполнитель' }

export function TaskTable({ tasks, columns }: { tasks: Row[]; columns: Column[] }) {
  const navigate = useNavigate()
  const { data: profiles } = useProfiles()
  const second = (t: Row) =>
    columns
      .map((c) => (c === 'object' ? t.object?.name : profiles?.byId.get(t.assignee_id)?.full_name))
      .filter(Boolean)
      .join(' · ')
  return (
    <>
      {/* phones: compact cards */}
      <ul className="space-y-2 sm:hidden">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link
              to={`/tasks/${t.id}`}
              className="bg-card focus-visible:ring-ring block rounded-lg border p-3.5 focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold">{t.title}</span>
                <StatusBadge status={t.status} />
              </div>
              <p className="text-muted-foreground mt-1.5 text-sm">{second(t)}</p>
              <p className="text-muted-foreground mt-1 font-mono text-xs">{formatDate(t.created_at)}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="bg-card hidden overflow-hidden rounded-lg border sm:block">
        <Table className="min-w-[620px] table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="eyebrow w-[38%]">Задача</TableHead>
              {columns.map((c) => (
                <TableHead key={c} className="eyebrow">
                  {HEAD[c]}
                </TableHead>
              ))}
              <TableHead className="eyebrow w-[160px]">Статус</TableHead>
              <TableHead className="eyebrow w-[150px] text-right">Создана</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TableRow
                key={t.id}
                className="hover:bg-secondary cursor-pointer"
                onClick={() => navigate(`/tasks/${t.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks/${t.id}`)}
                tabIndex={0}
                role="link"
                aria-label={t.title}
              >
                <TableCell className="truncate py-3 font-semibold">{t.title}</TableCell>
                {columns.map((c) => (
                  <TableCell key={c} className="truncate">
                    {c === 'object' ? t.object?.name : profiles?.byId.get(t.assignee_id)?.full_name}
                  </TableCell>
                ))}
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-right font-mono text-xs">{formatDate(t.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
