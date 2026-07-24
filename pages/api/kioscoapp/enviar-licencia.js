import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { contacto, kiosco, licenciaKey, vence } = req.body

  if (!contacto || !licenciaKey)
    return res.status(400).json({ error: 'Faltan datos' })

  // A diferencia de PeluApp (que usa un archivo .lic), KioscoApp se activa pegando la clave
  // como texto en la pantalla de Licencia de la app — por eso va en el cuerpo del email, no
  // como adjunto.
  const { error } = await resend.emails.send({
    from:    'KioscoApp <licencias@servicio-turno-web-peluapp.xyz>',
    to:      contacto,
    subject: `Tu licencia de KioscoApp — ${kiosco}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#09090b;color:#ffffff;border-radius:16px">
        <h2 style="color:#60a5fa;margin-bottom:8px">🏪 KioscoApp</h2>
        <p style="color:#d4d4d8">Hola! Te dejamos la licencia para <strong>${kiosco}</strong>.</p>
        <div style="background:#18181b;border:1px solid #3f3f46;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:0;color:#a1a1aa;font-size:14px">📅 Válida hasta</p>
          <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:bold">${vence}</p>
        </div>
        <p style="color:#71717a;font-size:14px">Para activarla, abrí KioscoApp y pegá esta clave en la pantalla de Licencia:</p>
        <div style="background:#18181b;border:1px solid #3f3f46;border-radius:12px;padding:16px;margin:12px 0;word-break:break-all;font-family:monospace;font-size:12px;color:#93c5fd">
          ${licenciaKey}
        </div>
        <hr style="border:none;border-top:1px solid #27272a;margin:24px 0"/>
        <p style="color:#52525b;font-size:12px">Si tenés algún problema, respondé este correo.</p>
      </div>
    `,
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
