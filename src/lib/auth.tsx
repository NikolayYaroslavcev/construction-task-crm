import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase, type Profile } from './supabase'

type AuthState = { profile: Profile | null; loading: boolean; missingProfile: boolean }

const AuthContext = createContext<AuthState>({ profile: null, loading: true, missingProfile: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [state, setState] = useState<AuthState>({ profile: null, loading: true, missingProfile: false })
  const currentUser = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    const load = async (userId: string | null) => {
      if (!userId) return setState({ profile: null, loading: false, missingProfile: false })
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      // a network error must not log the user out: keep what we had
      if (error) return setState((s) => ({ ...s, loading: false }))
      setState({ profile: data, loading: false, missingProfile: !data })
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null
      // supabase-js re-emits SIGNED_IN on tab focus and token refresh; react only to a real user change
      if (userId === currentUser.current) return
      // never show one user's cached data to the next one on a shared computer
      if (currentUser.current !== undefined) qc.clear()
      currentUser.current = userId
      // defer: Supabase calls must not run inside the auth callback itself
      setTimeout(() => load(userId), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [qc])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

/** Profile of the signed-in user; only used inside routes guarded by RequireAuth. */
export const useMe = () => useContext(AuthContext).profile!
