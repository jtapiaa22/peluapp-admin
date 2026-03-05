import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { peluqueria, contacto, machineId, nombreMaquina, desde, hasta, notas, esNuevoCliente, esRenovacion } = req.body

  if (!peluqueria || !machineId || !desde || !hasta)
    return res.status(400).json({ error: 'Faltan campos obligatorios' })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  if (esRenovacion) {
    // Renovar: sin ninguna validación, siempre permitido
  } else if (esNuevoCliente && contacto) {
    // Desde "Nueva licencia": el contacto no puede existir en absoluto
    const { data: existente } = await sb
      .from('licencias_vendidas')
      .select('id')
      .eq('contacto', contacto)
      .limit(1)

    if (existente?.length > 0) {
      return res.status(400).json({
        error: `Ya existe un cliente registrado con el contacto "${contacto}". Buscalo en el dashboard y agregá la máquina desde su detalle.`
      })
    }
  } else if (!esNuevoCliente && contacto) {
    // Agregar nueva máquina: bloquear si esa máquina puntual ya existe
    const { data: existente } = await sb
      .from('licencias_vendidas')
      .select('id')
      .eq('contacto', contacto)
      .eq('machine_id', machineId)
      .limit(1)

    if (existente?.length > 0) {
      return res.status(400).json({
        error: 'Esta máquina ya tiene una licencia registrada para ese cliente. Usá "Renovar" desde el detalle.'
      })
    }
  }

  const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY
  const firma = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`peluapp|${machineId}|${desde}|${hasta}`)
    .digest('hex')

  const datos     = { app: 'peluapp', machineId, desde, vence: hasta, firma }
  const licBase64 = Buffer.from(JSON.stringify(datos)).toString('base64')

  const { error } = await sb.from('licencias_vendidas').insert({
    peluqueria,
    contacto:       contacto      || null,
    machine_id:     machineId,
    nombre_maquina: nombreMaquina || null,
    desde,
    vence:          hasta,
    lic_base64:     licBase64,
    notas:          notas         || null,
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({
    licBase64,
    nombreArchivo: `licencia-${peluqueria.replace(/\s+/g, '-')}-${hasta}.lic`
  })
}
