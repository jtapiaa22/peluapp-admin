import { createClient } from '@supabase/supabase-js'

// service_role bypasea RLS — NUNCA exponer esto al browser
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

export default async function handler(req, res) {
  // Verificar que sea el admin (misma lógica que login.js)
  const auth = req.headers['x-admin-auth']
  if (auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const sb = getSupabase()

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('licencias_vendidas')
      .select('*')
      .order('creada_en', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).end()
}
