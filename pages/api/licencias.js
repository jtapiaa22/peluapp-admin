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
    let query = sb.from('licencias_vendidas').select('*').order('creada_en', { ascending: false })
    if (nombre) query = query.eq('peluqueria', nombre)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  // ?id=X          → elimina una licencia individual
  // ?peluqueria=X  → elimina TODAS las licencias del cliente
  if (req.method === 'DELETE') {
    const { id, peluqueria } = req.query

    if (id) {
      const { error } = await sb.from('licencias_vendidas').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    if (peluqueria) {
      // También borrar pagos del cliente al eliminar
      await sb.from('pagos').delete().eq('peluqueria', peluqueria)
      const { error } = await sb.from('licencias_vendidas').delete().eq('peluqueria', peluqueria)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Falta id o peluqueria' })
  }

  // ── PUT ──────────────────────────────────────────────────────────────────
  // body: { peluqueriaActual, peluqueriaNueva?, contacto?, telefono? }
  if (req.method === 'PUT') {
    const { peluqueriaActual, peluqueriaNueva, contacto, telefono } = req.body
    if (!peluqueriaActual) return res.status(400).json({ error: 'Falta peluqueriaActual' })

    const updates = {}
    if (peluqueriaNueva && peluqueriaNueva.trim() !== peluqueriaActual)
      updates.peluqueria = peluqueriaNueva.trim()
    if (contacto !== undefined)
      updates.contacto = contacto.trim() || null
    if (telefono !== undefined)
      updates.telefono = telefono.trim() || null

    if (!Object.keys(updates).length)
      return res.status(200).json({ ok: true, peluqueriaNueva: peluqueriaActual })

    const { error } = await sb
      .from('licencias_vendidas')
      .update(updates)
      .eq('peluqueria', peluqueriaActual)

    if (error) return res.status(500).json({ error: error.message })

    // Si cambió el nombre, también actualizar en la tabla de pagos
    if (updates.peluqueria) {
      await sb
        .from('pagos')
        .update({ peluqueria: updates.peluqueria })
        .eq('peluqueria', peluqueriaActual)
    }

    return res.status(200).json({ ok: true, peluqueriaNueva: updates.peluqueria || peluqueriaActual })
  }

  return res.status(405).end()
}
