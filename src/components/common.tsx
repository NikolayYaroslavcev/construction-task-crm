import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_LABEL } from '@/lib/status'
import type { TaskStatus } from '@/lib/supabase'
import { STATUS_CHIP, STATUS_DOT } from '@/lib/statusStyles'
import { cn } from '@/lib/utils'

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[11px] leading-none font-medium tracking-wide whitespace-nowrap uppercase',
        STATUS_CHIP[status],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="text-muted-foreground mt-1.5">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-muted-foreground hover:text-primary mb-4 inline-flex items-center gap-1.5 text-sm">
      <ArrowLeft className="size-4" />
      {children}
    </Link>
  )
}

export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="mt-8 mb-3 flex items-center gap-2 text-base font-bold">
      {children}
      {count !== undefined && <span className="bg-ink rounded-full px-2 py-0.5 font-mono text-xs font-medium text-white">{count}</span>}
    </h2>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">{children}</p>
}

export function ErrorNote({ error }: { error: Error | null | undefined }) {
  if (!error) return null
  return (
    <p role="alert" className="border-destructive bg-destructive/10 text-destructive my-3 rounded-r-md border-l-3 px-3 py-2 text-sm">
      {error.message}
    </p>
  )
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Загрузка">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="bg-card h-12 w-full" />
      ))}
    </div>
  )
}
