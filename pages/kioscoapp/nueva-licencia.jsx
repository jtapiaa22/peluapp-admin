import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeft, Mail, Inbox, Copy, Check, ArrowRight } from 'lucide-react'
import { Shell, TopBar, Main, BackLink } from '@/components/Layout'
import { Card, Field, Input, Alert, Badge, Button } from '@/components/ui'


function fechaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const FORM_INICIAL = {
  kiosco:          '',
  nombreContacto:  '',
  contacto:        '',
  telefono:        '',
  machineId:       '',
  nombreMaquina:   '',
  desde:           fechaHoy(),
  hasta:           '',
  notas:           '',
  precio:          '',
}


export default function NuevaLicenciaKiosco() {
  const router = useRouter()

  const [form, setForm]                 = useState(FORM_INICIAL)
  const [solicitudId, setSolicitudId]   = useState(null)
  const [loading, setLoading]           = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [msg, setMsg]                   = useState(null)
  const [licGenerada, setLicGenerada]   = useState(null)
  const [copiado, setCopiado]           = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('admin_auth')) { router.push('/'); return }
    if (!router.isReady) return

    const { solicitudId: sid, kiosco, nombreContacto, contacto, telefono, machineId, nombreMaquina } = router.query
    if (sid) {
      setSolicitudId(sid)
      setForm(f => ({
        ...f,
        kiosco:         kiosco         || f.kiosco,
        nombreContacto: nombreContacto || f.nombreContacto,
        contacto:       contacto       || f.contacto,
        telefono:       telefono       || f.telefono,
        machineId:      machineId      || f.machineId,
        nombreMaquina:  nombreMaquina  || f.nombreMaquina,
      }))
    }
  }, [router.isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generar(e) {
    e.preventDefault()

    if (form.hasta && form.hasta < form.desde) {
      setMsg({ tipo: 'error', texto: 'La fecha de vencimiento debe ser posterior a la fecha de inicio.' })
      return
    }

    setMsg(null); setLicGenerada(null); setLoading(true)
    try {
      const res = await fetch('/api/kioscoapp/generar-licencia', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': sessionStorage.getItem('admin_auth'),
        },
        body: JSON.stringify({ ...form, esNuevoCliente: true, solicitudId }),
      })
      const data = await res.json()
      if (!res.ok) return setMsg({ tipo: 'error', texto: data.error })
      setLicGenerada({ licenciaKey: data.licenciaKey, vence: form.hasta })
      setMsg({ tipo: 'ok', texto: 'Licencia generada correctamente' })
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
    } finally {
      setLoading(false)
    }
  }

  function copiar() {
    navigator.clipboard.writeText(licGenerada.licenciaKey)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function enviarEmail() {
    setLoadingEmail(true)
    try {
      const res = await fetch('/api/kioscoapp/enviar-licencia', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': sessionStorage.getItem('admin_auth'),
        },
        body: JSON.stringify({
          contacto:     form.contacto,
          kiosco:       form.kiosco,
          licenciaKey:  licGenerada.licenciaKey,
          vence:        licGenerada.vence,
        }),
      })
      setMsg(
        res.ok
          ? { tipo: 'ok',    texto: `Email enviado a ${form.contacto}` }
          : { tipo: 'error', texto: 'Error al enviar el email' }
      )
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
    } finally {
      setLoadingEmail(false)
    }
  }

  function nuevaLicencia() {
    setForm(FORM_INICIAL)
    setLicGenerada(null)
    setMsg(null)
  }

  return (
    <Shell>
      <TopBar>
        <BackLink icon={ArrowLeft} label="Volver" onClick={() => router.push('/kioscoapp/dashboard')} />
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-300 font-medium">Nueva licencia KioscoApp</span>
      </TopBar>

      <Main>
        <div className="mb-6 fade-in">
          <h1 className="text-2xl font-bold text-white">Nuevo cliente</h1>
          <p className="text-zinc-500 text-sm mt-1">Completá los datos para generar la primera licencia</p>
          {solicitudId && (
            <Badge tone="blue" className="mt-2">
              <Inbox size={12} /> Desde solicitud de activación remota
            </Badge>
          )}
        </div>

        <Card>
          <form onSubmit={generar} className="flex flex-col gap-5">
            <div className="pb-4 border-b border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Datos del cliente</p>

              <div className="flex flex-col gap-4">
                <Field label="Nombre del kiosco *">
                  <Input accent="blue" required value={form.kiosco} placeholder="Ej: Kiosco Don José"
                    onChange={e => setForm(f => ({ ...f, kiosco: e.target.value }))} />
                </Field>

                <Field label="Nombre de la persona">
                  <Input accent="blue" value={form.nombreContacto} placeholder="Ej: José Pérez"
                    onChange={e => setForm(f => ({ ...f, nombreContacto: e.target.value }))} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Email *" hint="Para enviar la licencia y contactar">
                    <Input accent="blue" required type="email" value={form.contacto} placeholder="jose@gmail.com"
                      onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} />
                  </Field>
                  <Field label="Teléfono / WhatsApp">
                    <Input accent="blue" type="tel" value={form.telefono} placeholder="+54 9 11 1234-5678"
                      onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                  </Field>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Licencia</p>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Machine ID *" hint="Lo ve el cliente en la pantalla de Licencia de la app">
                    <Input accent="blue" required value={form.machineId} placeholder="ID único de la máquina"
                      onChange={e => setForm(f => ({ ...f, machineId: e.target.value }))} />
                  </Field>
                  <Field label="Nombre de la máquina">
                    <Input accent="blue" value={form.nombreMaquina} placeholder="Ej: PC Mostrador"
                      onChange={e => setForm(f => ({ ...f, nombreMaquina: e.target.value }))} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Desde *">
                    <Input accent="blue" required type="date" value={form.desde}
                      onChange={e => setForm(f => ({ ...f, desde: e.target.value }))} />
                  </Field>
                  <Field label="Hasta *">
                    <Input accent="blue" required type="date" value={form.hasta}
                      onChange={e => setForm(f => ({ ...f, hasta: e.target.value }))} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Precio cobrado ($)" hint="Podés dejarlo vacío si aún no pagó">
                    <Input accent="blue" type="number" min="0" step="0.01" value={form.precio} placeholder="Ej: 15000"
                      onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                  </Field>
                  <Field label="Notas internas">
                    <Input accent="blue" value={form.notas} placeholder="Ej: amigo, paga el 20..."
                      onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
                  </Field>
                </div>
              </div>
            </div>

            {msg && <Alert tone={msg.tipo}>{msg.texto}</Alert>}

            {licGenerada ? (
              <>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <p className="text-zinc-500 text-xs mb-2">Clave de licencia — pegar en la app:</p>
                  <code className="text-blue-300 text-xs font-mono break-all">{licGenerada.licenciaKey}</code>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={copiar}>
                    {copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar clave</>}
                  </Button>
                  <Button type="button" variant="primary" accent="blue" size="lg" className="flex-1"
                    disabled={loadingEmail || !form.contacto} onClick={enviarEmail}>
                    <Mail size={16} /> {loadingEmail ? 'Enviando…' : `Enviar a ${form.contacto}`}
                  </Button>
                </div>
              </>
            ) : (
              <Button type="submit" variant="primary" accent="blue" size="lg" disabled={loading} className="w-full">
                {loading ? 'Generando…' : 'Generar licencia'}
              </Button>
            )}

            {licGenerada && (
              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={nuevaLicencia} className="text-zinc-500 hover:text-white text-sm transition-colors">
                  + Cargar otra licencia
                </button>
                <button type="button" onClick={() => router.push('/kioscoapp/dashboard')}
                  className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm transition-colors">
                  Ir al dashboard <ArrowRight size={14} />
                </button>
              </div>
            )}
          </form>
        </Card>
      </Main>
    </Shell>
  )
}
