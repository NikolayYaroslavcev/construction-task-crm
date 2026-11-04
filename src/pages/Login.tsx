import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ErrorNote } from '../components/ui'
import { useAuth } from '../lib/auth'
import { errorText, supabase } from '../lib/supabase'

export function Login() {
  const { profile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (profile) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(errorText(error))
  }

  return (
    <div className="login">
      <div className="login__panel">
        <div className="login__head">
          <span className="brand__mark brand__mark--lg" aria-hidden />
          <h1>Стройконтроль</h1>
          <p>Объекты, задачи и приёмка работ</p>
        </div>
        <form className="form" onSubmit={submit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus />
          </label>
          <label>
            Пароль
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          <ErrorNote text={error} />
          <button className="btn btn--primary btn--block" disabled={busy}>
            {busy ? 'Входим…' : 'Войти'}
          </button>
        </form>
        <p className="login__note">Регистрация закрыта. Доступ выдаёт администратор.</p>
      </div>
    </div>
  )
}
