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
  if (req.method === 'GET') {
    const { nombre } = req.query
    let query = sb.from('kioscoapp_licencias').select('*').order('creada_en', { ascending: false })
    if (nombre) query = query.eq('kiosco', nombre)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  // ?id=X      → elimina una licencia individual
  // ?kiosco=X  → elimina TODAS las licencias del cliente
  if (req.method === 'DELETE') {
    const { id, kiosco } = req.query

    if (id) {
      const { error } = await sb.from('kioscoapp_licencias').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    if (kiosco) {
      await sb.from('kioscoapp_pagos').delete().eq('kiosco', kiosco)
      const { error } = await sb.from('kioscoapp_licencias').delete().eq('kiosco', kiosco)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Falta id o kiosco' })
  }

  // ── PUT ──────────────────────────────────────────────────────────────────
  // body: { kioscoActual, kioscoNuevo?, contacto?, telefono?, nombre_contacto? }
  if (req.method === 'PUT') {
    const { kioscoActual, kioscoNuevo, contacto, telefono, nombre_contacto } = req.body
    if (!kioscoActual) return res.status(400).json({ error: 'Falta kioscoActual' })

    const updates = {}
    if (kioscoNuevo && kioscoNuevo.trim() !== kioscoActual)
      updates.kiosco = kioscoNuevo.trim()
    if (contacto !== undefined)
      updates.contacto = contacto.trim() || null
    if (telefono !== undefined)
      updates.telefono = telefono.trim() || null
    if (nombre_contacto !== undefined)
      updates.nombre_contacto = nombre_contacto.trim() || null

    if (!Object.keys(updates).length)
      return res.status(200).json({ ok: true, kioscoNuevo: kioscoActual })

    const { error } = await sb
      .from('kioscoapp_licencias')
      .update(updates)
      .eq('kiosco', kioscoActual)

    if (error) return res.status(500).json({ error: error.message })

    if (updates.kiosco) {
      await sb
        .from('kioscoapp_pagos')
        .update({ kiosco: updates.kiosco })
        .eq('kiosco', kioscoActual)
    }

    return res.status(200).json({ ok: true, kioscoNuevo: updates.kiosco || kioscoActual })
  }

  return res.status(405).end()
}
