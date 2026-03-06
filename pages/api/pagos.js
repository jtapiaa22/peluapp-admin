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
  // ?peluqueria=X  → pagos de ese cliente
  // (sin query)    → todos los pagos
  if (req.method === 'GET') {
    const { peluqueria } = req.query
    let query = sb
      .from('pagos')
      .select('*')
      .order('pagado_en', { ascending: false })
    if (peluqueria) query = query.eq('peluqueria', peluqueria)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { peluqueria, monto, pagado_en, metodo, nota } = req.body
    if (!peluqueria || !monto || !pagado_en)
      return res.status(400).json({ error: 'Faltan campos obligatorios (peluqueria, monto, pagado_en)' })

    const { data, error } = await sb
      .from('pagos')
      .insert({
        peluqueria,
        monto:     parseFloat(monto),
        pagado_en,
        metodo:    metodo || 'Transferencia',
        nota:      nota   || null,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Falta id' })
    const { error } = await sb.from('pagos').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
