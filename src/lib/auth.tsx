import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, type Profile } from './supabase'

type AuthState = { profile: Profile | null; loading: boolean }

const AuthContext = createContext<AuthState>({ profile: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ profile: null, loading: true })

  useEffect(() => {
    const load = async (userId: string | undefined) => {
      if (!userId) return setState({ profile: null, loading: false })
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      setState({ profile: data, loading: false })
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // defer: Supabase calls must not run inside the auth callback itself
        setTimeout(() => load(session?.user.id), 0)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

/** Profile of the signed-in user; only used inside routes guarded by RequireAuth. */
export const useMe = () => useContext(AuthContext).profile!
