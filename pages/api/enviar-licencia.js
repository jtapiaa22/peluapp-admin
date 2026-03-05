import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { contacto, peluqueria, licBase64, nombreArchivo, vence } = req.body

  if (!contacto || !licBase64)
    return res.status(400).json({ error: 'Faltan datos' })

  const { error } = await resend.emails.send({
    from:    'PeluApp <licencias@servicio-turno-web-peluapp.xyz>',
    to:      contacto,
    subject: `Tu licencia de PeluApp — ${peluqueria}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#09090b;color:#ffffff;border-radius:16px">
        <h2 style="color:#a78bfa;margin-bottom:8px">✂️ PeluApp</h2>
        <p style="color:#d4d4d8">Hola! Te adjuntamos tu archivo de licencia para <strong>${peluqueria}</strong>.</p>
        <div style="background:#18181b;border:1px solid #3f3f46;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:0;color:#a1a1aa;font-size:14px">📅 Válida hasta</p>
          <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:bold">${vence}</p>
        </div>
        <p style="color:#71717a;font-size:14px">
          Para activarla, abrí la app y cargá el archivo <code style="background:#27272a;padding:2px 6px;border-radius:4px">.lic</code> adjunto desde el menú de licencias.
        </p>
        <hr style="border:none;border-top:1px solid #27272a;margin:24px 0"/>
        <p style="color:#52525b;font-size:12px">Si tenés algún problema, respondé este correo.</p>
      </div>
    `,
    attachments: [
      {
        filename: nombreArchivo,
        content:  Buffer.from(licBase64),  // ← clave: Buffer, no string
      }
    ],
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
