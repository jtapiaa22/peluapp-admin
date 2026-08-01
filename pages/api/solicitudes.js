import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

export default async function handler(req, res) {
  const auth = req.headers['x-admin-auth']
  if (auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const sb = getSupabase()

  // ── GET ──────────────────────────────────────────────────────────────────
  // ?estado=pendiente → filtra por estado (por defecto trae todas)
  if (req.method === 'GET') {
    const { estado } = req.query
    let query = sb.from('peluqueria_solicitudes').select('*').order('creada_en', { ascending: false })
    if (estado) query = query.eq('estado', estado)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // ── PATCH ────────────────────────────────────────────────────────────────
  // ?id=X   body: { estado: 'rechazada' } → descarta una solicitud pendiente
  if (req.method === 'PATCH') {
    const { id } = req.query
    const { estado } = req.body

    if (!id) return res.status(400).json({ error: 'Falta id' })
    if (estado !== 'rechazada') return res.status(400).json({ error: 'Estado inválido' })

    const { error } = await sb
      .from('peluqueria_solicitudes')
      .update({ estado: 'rechazada', resuelta_en: new Date().toISOString() })
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
