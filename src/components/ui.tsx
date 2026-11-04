import { useEffect, useRef, type ReactNode } from 'react'
import { STATUS_LABEL } from '../lib/status'
import type { TaskStatus } from '../lib/supabase'

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>
}

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="modal" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="modal__body">
        <h2 className="modal__title">{title}</h2>
        {open && children}
      </div>
    </dialog>
  )
}

export function ErrorNote({ text }: { text: string }) {
  return text ? <p className="error" role="alert">{text}</p> : null
}

export function Loading() {
  return <p className="loading" aria-live="polite">Загрузка…</p>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}
