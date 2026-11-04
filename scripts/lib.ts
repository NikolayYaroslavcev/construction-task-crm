import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL!
const key = process.env.VITE_SUPABASE_ANON_KEY!

export const anon = () => createClient(url, key, { auth: { persistSession: false } })

export async function signIn(who: 'MANAGER' | 'WORKER1' | 'WORKER2'): Promise<{ db: SupabaseClient; id: string }> {
  const db = anon()
  const { data, error } = await db.auth.signInWithPassword({
    email: process.env[`${who}_EMAIL`]!,
    password: process.env[`${who}_PASSWORD`]!,
  })
  if (error) throw new Error(`${who} sign-in failed: ${error.message}`)
  return { db, id: data.user.id }
}
