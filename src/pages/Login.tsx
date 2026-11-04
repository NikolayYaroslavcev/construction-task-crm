import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { errorText, supabase } from '@/lib/supabase'

export function Login() {
  const { profile, missingProfile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (profile) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(errorText(error))
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="animate-rise bg-card relative w-full max-w-[400px] overflow-hidden rounded-xl border p-8 shadow-[0_8px_24px_-12px_rgb(29_27_24/0.25)]">
        <div className="hazard-stripe absolute inset-x-0 top-0 h-1.5" />
        <span className="brand-mark size-7" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Стройконтроль</h1>
        <p className="text-muted-foreground mt-1">Объекты, задачи и приёмка работ</p>

        <form onSubmit={submit} className="mt-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Пароль</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>
            {(error || missingProfile) && (
              <p role="alert" className="border-destructive bg-destructive/10 text-destructive rounded-r-md border-l-3 px-3 py-2 text-sm">
                {error || 'Учётная запись ещё не настроена: обратитесь к постановщику.'}
              </p>
            )}
            <Button type="submit" size="lg" className="h-10 w-full" disabled={busy}>
              {busy ? 'Входим…' : 'Войти'}
            </Button>
          </FieldGroup>
        </form>
        <p className="text-muted-foreground mt-5 text-center text-[13px]">Регистрация закрыта. Доступ выдаёт постановщик.</p>
      </div>
    </div>
  )
}
