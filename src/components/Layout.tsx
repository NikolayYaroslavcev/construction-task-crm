import { NavLink, Outlet } from 'react-router-dom'
import { useMe } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function Layout() {
  const me = useMe()
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__inner">
          <NavLink to="/" className="brand">
            <span className="brand__mark" aria-hidden />
            Стройконтроль
          </NavLink>
          <nav className="nav">
            {me.role === 'executor' && <NavLink to="/my">Мои задачи</NavLink>}
            <NavLink to="/objects">Объекты</NavLink>
            {me.role === 'manager' && <NavLink to="/tasks">Все задачи</NavLink>}
          </nav>
          <div className="whoami">
            <span className="whoami__name">{me.full_name}</span>
            <span className="whoami__role">{me.role === 'manager' ? 'постановщик' : 'исполнитель'}</span>
            <button className="btn btn--ghost btn--sm" onClick={() => supabase.auth.signOut()}>
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
