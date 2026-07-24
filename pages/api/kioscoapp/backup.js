import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

const BUCKET = 'kioscoapp-backups'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const auth = req.headers['x-admin-auth']
  if (auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const { machineId } = req.query
  if (!machineId) return res.status(400).json({ error: 'Falta machineId' })

  const sb = getSupabase()
  const path = `${machineId}/backup.zip`

  // Confirmar que el archivo existe antes de firmar la URL, para poder devolver un 404 claro
  // en vez de una URL firmada que después falla al descargar.
  const carpeta = machineId
  const { data: listado, error: errorListado } = await sb.storage.from(BUCKET).list(carpeta)
  if (errorListado) return res.status(500).json({ error: errorListado.message })
  if (!listado?.some(f => f.name === 'backup.zip')) {
    return res.status(404).json({ error: 'Todavía no hay ningún backup subido para esta máquina.' })
  }

  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 300)
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ url: data.signedUrl })
}
