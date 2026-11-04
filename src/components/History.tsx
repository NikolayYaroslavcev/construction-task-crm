import { ArrowRight } from 'lucide-react'
import { useProfiles } from '@/lib/queries'
import { formatDate, STATUS_LABEL } from '@/lib/status'
import type { HistoryEntry } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { STATUS_BORDER } from '@/lib/statusStyles'

/** Vertical site-log: newest first. Status changes, reassignments and edits. */
export function History({ entries }: { entries: HistoryEntry[] }) {
  const { data: profiles } = useProfiles()
  // an executor cannot read colleagues' profiles (RLS), so their names stay hidden
  const name = (id: string | null) => (id && profiles?.byId.get(id)?.full_name) || 'другой исполнитель'

  return (
    <ol className="before:bg-border relative before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-0.5">
      {entries.map((h) => (
        <li key={h.id} className="relative pb-5 pl-7">
          <span
            className={cn(
              'bg-card absolute top-1.5 left-0 size-3 rounded-full border-[3px]',
              h.event === 'status'
                ? STATUS_BORDER[h.to_status]
                : h.event === 'delete'
                  ? 'border-destructive'
                  : 'border-muted-foreground/50',
            )}
            aria-hidden
          />
          <p className="text-sm">
            {h.event === 'status' &&
              (h.from_status ? (
                <>
                  {STATUS_LABEL[h.from_status]} <ArrowRight className="text-muted-foreground inline size-3.5" />{' '}
                  <b>{STATUS_LABEL[h.to_status]}</b>
                </>
              ) : (
                <b>Задача создана</b>
              ))}
            {h.event === 'reassign' && (
              <>
                Исполнитель: {name(h.from_assignee)} <ArrowRight className="text-muted-foreground inline size-3.5" />{' '}
                <b>{name(h.to_assignee)}</b>
              </>
            )}
            {h.event === 'delete' && <b className="text-destructive">Задача удалена</b>}
            {h.event === 'edit' && (
              <>
                Изменено: <b>{h.comment}</b>
              </>
            )}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[13px]">
            {profiles?.byId.get(h.changed_by)?.full_name ?? '—'} · <span className="font-mono text-xs">{formatDate(h.created_at)}</span>
          </p>
          {h.event === 'status' && h.comment && (
            <p className="border-l-st-rework bg-card mt-2 rounded-r-md border border-l-3 px-3 py-2 text-sm">{h.comment}</p>
          )}
        </li>
      ))}
    </ol>
  )
}
