import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'


// FIX: singleton — una sola instancia por proceso, no por request
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const _sk = ['pelu', 'app', '-', 'jo', 'free', '-', '20', '26']
const SECRET_KEY = _sk[0]+_sk[1]+_sk[2]+_sk[3]+_sk[4]+_sk[5]+_sk[6]+_sk[7]


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // FIX: validar autenticación de admin en cada request
  const auth = req.headers['x-admin-auth']
  if (!auth || auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const {
    peluqueria, contacto, machineId, nombreMaquina,
    desde, hasta, notas, esNuevoCliente, esRenovacion, precio,
  } = req.body

  if (!peluqueria || !machineId || !desde || !hasta)
    return res.status(400).json({ error: 'Faltan campos obligatorios' })

  // FIX: validación de fechas en el servidor
  if (hasta < desde)
    return res.status(400).json({ error: 'La fecha de vencimiento debe ser posterior a la fecha de inicio.' })

  // ── Validaciones de negocio ───────────────────────────────────────────────

  if (esRenovacion) {
    // FIX: verificar que el machineId pertenece a esa peluquería
    const { data: maq } = await sb
      .from('licencias_vendidas')
      .select('id')
      .eq('peluqueria', peluqueria)
      .eq('machine_id', machineId)
      .limit(1)

    if (!maq?.length) {
      return res.status(400).json({
        error: 'No se encontró esa máquina para esta peluquería.',
      })
    }

  } else if (esNuevoCliente && contacto) {
    const { data: existente } = await sb
      .from('licencias_vendidas')
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
      .from('licencias_vendidas')
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

  // ── Generación de la licencia ─────────────────────────────────────────────

  // FIX: separador \n en lugar de | para evitar ambigüedad en el HMAC
  const firma = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`peluapp\n${machineId}\n${desde}\n${hasta}`)
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
    precio:         precio ? parseFloat(precio) : null,
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({
    licBase64,
    nombreArchivo: `licencia-${peluqueria.replace(/\s+/g, '-')}-${hasta}.lic`,
  })
}
