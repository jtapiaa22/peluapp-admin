import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

/**
 * Clave del panel de turnos (peluapp-web /admin) de una peluquería.
 *
 * Se administra desde acá y no como autoservicio en el propio panel: el
 * peluqueria_id viaja en el link público de reservas y con la clave pública de
 * Supabase se puede listar `peluquerias` con sus emails, así que cualquier
 * "creá tu clave la primera vez" sería reclamable por un tercero.
 *
 * GET  ?nombre=<nombre del cliente>  → peluquerías que matchean + si ya tienen clave
 * POST { peluqueria_id, clave }      → crea o reemplaza la clave
 */
export default async function handler(req, res) {
  const auth = req.headers['x-admin-auth']
  if (auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const sb = getSupabase()

  if (req.method === 'GET') {
    const { nombre } = req.query
    if (!nombre) return res.status(400).json({ error: 'Falta el nombre' })

    // El panel de licencias se maneja por nombre y no guarda el id de la tabla
    // `peluquerias`, así que buscamos por nombre aproximado y, si hay más de una,
    // que elija a mano.
    const { data: peluquerias, error } = await sb
      .from('peluquerias')
      .select('id, nombre, email, activo')
      .ilike('nombre', `%${nombre}%`)

    if (error) return res.status(500).json({ error: error.message })
    if (!peluquerias?.length) return res.status(200).json({ peluquerias: [] })

    const { data: conClave } = await sb
      .from('peluqueria_admin')
      .select('peluqueria_id, updated_at')
      .in('peluqueria_id', peluquerias.map(p => p.id))

    const mapa = new Map((conClave || []).map(c => [c.peluqueria_id, c.updated_at]))

    return res.status(200).json({
      peluquerias: peluquerias.map(p => ({
        ...p,
        tieneClave: mapa.has(p.id),
        claveActualizada: mapa.get(p.id) || null,
      })),
    })
  }

  if (req.method === 'POST') {
    const { peluqueria_id, clave } = req.body || {}
    if (!peluqueria_id || !clave) return res.status(400).json({ error: 'Faltan datos' })
    if (String(clave).length < 6) {
      return res.status(400).json({ error: 'La clave debe tener al menos 6 caracteres' })
    }

    const { data: pel } = await sb
      .from('peluquerias').select('id').eq('id', peluqueria_id).maybeSingle()
    if (!pel) return res.status(404).json({ error: 'Peluquería no encontrada' })

    const hash = await bcrypt.hash(String(clave), 10)

    const { error } = await sb.from('peluqueria_admin').upsert({
      peluqueria_id,
      password_hash: hash,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'peluqueria_id' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
