import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'


// ─── Helper ──────────────────────────────────────────────────────────────────

function fechaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const FORM_INICIAL = {
  peluqueria:    '',
  contacto:      '',
  machineId:     '',
  nombreMaquina: '',
  desde:         fechaHoy(),
  hasta:         '',
  notas:         '',
  precio:        '',
}


// ─── Página ───────────────────────────────────────────────────────────────────

export default function NuevaLicencia() {
  const router = useRouter()

  const [form, setForm]               = useState(FORM_INICIAL)
  const [loading, setLoading]         = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [msg, setMsg]                 = useState(null)
  const [licGenerada, setLicGenerada] = useState(null)

  const inp = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"

  // FIX: auth guard
  useEffect(() => {
    if (!sessionStorage.getItem('admin_auth')) router.push('/')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function generar(e) {
    e.preventDefault()

    // FIX: validación de fechas
    if (form.hasta && form.hasta < form.desde) {
      setMsg({ tipo: 'error', texto: 'La fecha de vencimiento debe ser posterior a la fecha de inicio.' })
      return
    }

    setMsg(null); setLicGenerada(null); setLoading(true)
    try {   // FIX: try/catch/finally
      const res  = await fetch('/api/generar-licencia', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, esNuevoCliente: true }),
      })
      const data = await res.json()
      if (!res.ok) return setMsg({ tipo: 'error', texto: data.error })
      setLicGenerada({ licBase64: data.licBase64, nombreArchivo: data.nombreArchivo, vence: form.hasta })
      setMsg({ tipo: 'ok', texto: '✅ Licencia generada correctamente' })
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
    } finally {
      setLoading(false)   // FIX: siempre se ejecuta, incluso si res.json() falla
    }
  }

  function descargar() {
    const blob = new Blob([licGenerada.licBase64], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = licGenerada.nombreArchivo; a.click()
    URL.revokeObjectURL(url)
  }

  async function enviarEmail() {
    setLoadingEmail(true)
    try {   // FIX: try/catch/finally
      const res = await fetch('/api/enviar-licencia', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contacto:      form.contacto,
          peluqueria:    form.peluqueria,
          licBase64:     licGenerada.licBase64,
          nombreArchivo: licGenerada.nombreArchivo,
          vence:         licGenerada.vence,
        }),
      })
      setMsg(
        res.ok
          ? { tipo: 'ok',    texto: `✅ Email enviado a ${form.contacto}` }
          : { tipo: 'error', texto: 'Error al enviar el email' }
      )
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
    } finally {
      setLoadingEmail(false)
    }
  }

  // FIX: limpia todo para cargar otra licencia sin recargar la página
  function nuevaLicencia() {
    setForm(FORM_INICIAL)
    setLicGenerada(null)
    setMsg(null)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-white transition-colors text-sm">
            ← Volver
          </button>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-300 font-medium">Nueva licencia</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 fade-in">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Nuevo cliente</h1>
          <p className="text-zinc-500 text-sm mt-1">Completá los datos para generar la primera licencia</p>
        </div>

        <form onSubmit={generar} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5">

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Nombre de la peluquería *</label>
            <input className={inp} required value={form.peluqueria}
              placeholder="Ej: Jofre Barber Shop"
              onChange={e => setForm(f => ({ ...f, peluqueria: e.target.value }))} />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Contacto / Email *</label>
            <input className={inp} required type="email" value={form.contacto}
              placeholder="Ej: jofre@gmail.com"
              onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} />
            <p className="text-xs text-zinc-600 mt-1">El email identifica al cliente y recibe la licencia. No puede repetirse.</p>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Nombre descriptivo de la PC</label>
            <input className={inp} value={form.nombreMaquina}
              placeholder="Ej: PC Principal, Sucursal Centro, Notebook"
              onChange={e => setForm(f => ({ ...f, nombreMaquina: e.target.value }))} />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Machine ID *</label>
            <input className={inp} required value={form.machineId}
              placeholder="ID que te mandó el cliente"
              onChange={e => setForm(f => ({ ...f, machineId: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Desde *</label>
              <input type="date" className={inp} required value={form.desde}
                onChange={e => setForm(f => ({ ...f, desde: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Vence *</label>
              {/* FIX: min evita seleccionar una fecha anterior a "desde" directo desde el picker */}
              <input type="date" className={inp} required value={form.hasta} min={form.desde}
                onChange={e => setForm(f => ({ ...f, hasta: e.target.value }))} />
            </div>
          </div>

          {/* FIX: precio y notas en el mismo grid, sin duplicar notas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Precio cobrado ($)</label>
              {/* FIX: min="0" para no permitir precios negativos */}
              <input type="number" min="0" className={inp} value={form.precio}
                placeholder="Ej: 20000"
                onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Notas internas</label>
              <input className={inp} value={form.notas}
                placeholder="Ej: pagó 3 meses, descuento"
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>

          {/* Mensaje */}
          {msg && (
            <div className={`px-4 py-3 rounded-xl text-sm border ${
              msg.tipo === 'ok'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {msg.texto}
            </div>
          )}

          {/* Botones */}
          {licGenerada ? (
            <div className="flex gap-3">
              <button type="button" onClick={descargar}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                ⬇ Descargar .lic
              </button>
              <button type="button" onClick={enviarEmail} disabled={loadingEmail || !form.contacto}
                className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                {loadingEmail ? 'Enviando…' : `✉ Enviar a ${form.contacto}`}
              </button>
            </div>
          ) : (
            <button type="submit" disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-violet-900/20">
              {loading ? 'Generando…' : 'Generar licencia'}
            </button>
          )}

          {/* FIX: acciones post-generación con opción de cargar otra */}
          {licGenerada && (
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={nuevaLicencia}
                className="text-zinc-500 hover:text-white text-sm transition-colors">
                + Cargar otra licencia
              </button>
              <button type="button" onClick={() => router.push('/dashboard')}
                className="text-zinc-500 hover:text-white text-sm transition-colors">
                Ir al dashboard →
              </button>
            </div>
          )}

        </form>
      </div>
    </div>
  )
}
