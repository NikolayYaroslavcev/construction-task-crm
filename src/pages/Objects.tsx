import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, ErrorNote, LoadingBlock, PageHeader } from '@/components/common'
import { STATUS_TEXT } from '@/lib/statusStyles'
import { ObjectForm } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMe } from '@/lib/auth'
import { useObjects } from '@/lib/queries'
import { STATUS_LABEL } from '@/lib/status'
import type { TaskStatus } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const ORDER: TaskStatus[] = ['new', 'in_progress', 'review', 'rework', 'accepted']

export function Objects() {
  const me = useMe()
  const [creating, setCreating] = useState(false)
  // for an executor RLS returns only their objects and only their tasks inside them
  const { data, error, isPending } = useObjects()

  return (
    <>
      <PageHeader
        eyebrow={me.role === 'manager' ? 'Все стройки' : 'Стройки, где у вас есть задачи'}
        title="Объекты"
        actions={
          me.role === 'manager' && (
            <Button size="lg" onClick={() => setCreating(true)}>
              <Plus /> Новый объект
            </Button>
          )
        }
      />
      <ErrorNote error={error} />
      {isPending && <LoadingBlock />}
      {data && !data.length && <Empty>Объектов пока нет.</Empty>}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
        {data?.map((o, i) => (
          <li key={o.id} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
            <Link
              to={`/objects/${o.id}`}
              className="group bg-card focus-visible:ring-ring relative flex h-full flex-col overflow-hidden rounded-lg border p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgb(29_27_24/0.25)] focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="bg-primary absolute inset-y-0 left-0 w-[3px] origin-bottom scale-y-0 transition-transform group-hover:scale-y-100" />
              <span className="text-muted-foreground font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="mt-2.5 text-lg font-bold">{o.name}</h2>
              <p className="text-muted-foreground mt-1 mb-4 text-sm">{o.address}</p>
              <div className="mt-auto flex flex-wrap gap-1.5 border-t border-dashed pt-3.5">
                {ORDER.map((s) => {
                  const n = o.tasks.filter((t) => t.status === s).length
                  return n ? (
                    <span key={s} className="bg-secondary rounded-sm px-2 py-1 text-xs">
                      {STATUS_LABEL[s]} <b className={cn('font-mono', STATUS_TEXT[s])}>{n}</b>
                    </span>
                  ) : null
                })}
                {!o.tasks.length && <span className="text-muted-foreground text-[13px]">нет задач</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый объект</DialogTitle>
          </DialogHeader>
          <ObjectForm onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
