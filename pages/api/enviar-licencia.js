import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { contacto, peluqueria, licBase64, nombreArchivo, vence } = req.body

  if (!contacto || !licBase64) 
    return res.status(400).json({ error: 'Faltan datos' })

  const { error } = await resend.emails.send({
    from: 'PeluApp <licencias@servicio-turno-web-peluapp.xyz>',
    to:      contacto,
    subject: `Tu licencia de PeluApp — ${peluqueria}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#7c3aed">✂️ PeluApp</h2>
        <p>Hola! Te adjuntamos tu archivo de licencia para <strong>${peluqueria}</strong>.</p>
        <p>📅 Válida hasta: <strong>${vence}</strong></p>
        <p style="color:#666;font-size:14px">
          Para activarla, abrí la app y cargá el archivo <code>.lic</code> adjunto 
          desde el menú de licencias.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">
          Si tenés algún problema, respondé este correo.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: nombreArchivo,
        content:  licBase64,
      }
    ],
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
