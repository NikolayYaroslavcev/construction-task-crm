import { KeyRound, LogOut } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PasswordForm } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMe } from '@/lib/auth'
import { useRealtime } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white',
    isActive && 'bg-white/10 text-white shadow-[inset_0_-2px_0_var(--primary)]',
  )

export function Layout() {
  const me = useMe()
  useRealtime()
  const isManager = me.role === 'manager'
  const [pwOpen, setPwOpen] = useState(false)
  return (
    <div className="min-h-screen">
      <header className="bg-ink sticky top-0 z-20 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-5">
          <NavLink to="/" className="font-heading flex items-center gap-2.5 text-[15px] font-bold tracking-wide">
            <span className="brand-mark size-3.5" aria-hidden />
            Стройконтроль
          </NavLink>
          <nav className="flex flex-wrap gap-1">
            {!isManager && (
              <NavLink to="/my" className={navClass}>
                Мои задачи
              </NavLink>
            )}
            <NavLink to="/objects" className={navClass}>
              Объекты
            </NavLink>
            {isManager && (
              <>
                <NavLink to="/tasks" className={navClass}>
                  Все задачи
                </NavLink>
                <NavLink to="/employees" className={navClass}>
                  Сотрудники
                </NavLink>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{me.full_name}</span>
            <span className="border-primary/50 text-primary rounded-sm border px-1.5 py-0.5 font-mono text-[11px] tracking-wider uppercase">
              {isManager ? 'постановщик' : 'исполнитель'}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => setPwOpen(true)}
              aria-label="Сменить пароль"
              title="Сменить пароль"
            >
              <KeyRound />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => supabase.auth.signOut()}
              aria-label="Выйти"
            >
              <LogOut /> <span className="hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>
        <div className="hazard-stripe h-[5px]" />
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-5">
        <Outlet />
      </main>
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Смена пароля</DialogTitle>
          </DialogHeader>
          <PasswordForm onDone={() => setPwOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
