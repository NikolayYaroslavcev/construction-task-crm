// Creates an employee account. Only a manager may call it.
// The service-role key exists only inside the Supabase runtime; it never reaches the browser or the repo.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  full_name: z.string().trim().min(2).max(100),
  role: z.enum(['manager', 'executor']),
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  // the caller, with their own token: RLS decides what they can read
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: auth } = await caller.auth.getUser()
  if (!auth.user) return json({ error: 'Not authenticated' }, 401)

  const { data: me } = await caller.from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
  if (me?.role !== 'manager') return json({ error: 'Only a manager can add employees' }, 403)

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Invalid data', issues: parsed.error.flatten().fieldErrors }, 400)
  const { email, password, full_name, role } = parsed.data

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) return json({ error: error.message }, error.status ?? 400)

  const { error: profileError } = await admin.from('profiles').insert({ id: created.user.id, full_name, role })
  if (profileError) {
    // keep auth users and profiles consistent
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: profileError.message }, 500)
  }
  return json({ id: created.user.id, email, full_name, role }, 201)
})
