import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { peluqueria, contacto, machineId, desde, hasta, notas } = req.body
  if (!peluqueria || !machineId || !desde || !hasta)
    return res.status(400).json({ error: 'Faltan campos' })

  const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY
  const firma = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`peluapp|${machineId}|${desde}|${hasta}`)
    .digest('hex')

  const datos = { app: 'peluapp', machineId, desde, vence: hasta, firma }
  const licBase64 = Buffer.from(JSON.stringify(datos)).toString('base64')

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { error } = await sb.from('licencias_vendidas').insert({
    peluqueria, contacto: contacto || null,
    machine_id: machineId, desde, vence: hasta,
    lic_base64: licBase64, notas: notas || null,
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({
    licBase64,
    nombreArchivo: `licencia-${peluqueria.replace(/\s+/g, '-')}-${hasta}.lic`
  })
}
