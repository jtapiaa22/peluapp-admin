import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Mismo SECRET que usa la app en src/main/license.ts y tools/generar-licencia.js — tiene que
// coincidir siempre, si uno cambia hay que cambiar los tres lugares.
const SECRET_KEY = process.env.KIOSCOAPP_LICENSE_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers['x-admin-auth']
  if (!auth || auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  if (!SECRET_KEY) {
    return res.status(500).json({ error: 'Falta configurar KIOSCOAPP_LICENSE_SECRET en el servidor.' })
  }

  const {
    kiosco, contacto, telefono, nombreContacto, machineId, nombreMaquina,
    desde, hasta, notas, esNuevoCliente, esRenovacion, precio,
  } = req.body

  if (!kiosco || !machineId || !desde || !hasta)
    return res.status(400).json({ error: 'Faltan campos obligatorios' })

  if (hasta < desde)
    return res.status(400).json({ error: 'La fecha de vencimiento debe ser posterior a la fecha de inicio.' })

  // ── Validaciones de negocio ───────────────────────────────────────────────

  if (esRenovacion) {
    const { data: maq } = await sb
      .from('kioscoapp_licencias')
      .select('id')
      .eq('kiosco', kiosco)
      .eq('machine_id', machineId)
      .limit(1)

    if (!maq?.length) {
      return res.status(400).json({
        error: 'No se encontró esa máquina para este kiosco.',
      })
    }

  } else if (esNuevoCliente && contacto) {
    const { data: existente } = await sb
      .from('kioscoapp_licencias')
      .select('id')
      .eq('contacto', contacto)
      .limit(1)

    if (existente?.length > 0) {
      return res.status(400).json({
        error: `Ya existe un cliente registrado con el contacto "${contacto}". Buscalo en el dashboard y agregá la máquina desde su detalle.`,
      })
    }

  } else if (!esNuevoCliente && contacto) {
    const { data: existente } = await sb
      .from('kioscoapp_licencias')
      .select('id')
      .eq('contacto', contacto)
      .eq('machine_id', machineId)
      .limit(1)

    if (existente?.length > 0) {
      return res.status(400).json({
        error: 'Esta máquina ya tiene una licencia registrada para ese cliente. Usá "Renovar" desde el detalle.',
      })
    }
  }

  // ── Generación de la licencia (mismo algoritmo que src/main/license.ts) ──

  const firma = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`kiosco|${machineId}|${desde}|${hasta}`)
    .digest('hex')

  const payload = { machineId, desde, vence: hasta, nombre: kiosco, firma }
  const licenciaKey = Buffer.from(JSON.stringify(payload)).toString('base64url')

  const { error } = await sb.from('kioscoapp_licencias').insert({
    kiosco,
    nombre_contacto: nombreContacto || null,
    contacto:        contacto      || null,
    telefono:        telefono      || null,
    machine_id:      machineId,
    nombre_maquina:  nombreMaquina || null,
    desde,
    vence:           hasta,
    licencia_key:    licenciaKey,
    notas:           notas         || null,
    precio:          precio ? parseFloat(precio) : null,
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ licenciaKey })
}
