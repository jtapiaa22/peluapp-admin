import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'


function fechaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function diasRestantes(vence) {
  const hoy = new Date(fechaHoy() + 'T00:00:00')
  const fv  = new Date(vence     + 'T00:00:00')
  return Math.round((fv - hoy) / (1000 * 60 * 60 * 24)) + 1
}

function getEstado(vence) {
  const dias = diasRestantes(vence)
  if (dias < 0)   return { label: 'Vencida',    text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dias }
  if (dias <= 15) return { label: 'Por vencer', text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dias }
  return            { label: 'Activa',      text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  dias }
}

function formatPrecio(p) {
  if (p == null || p === '') return '—'
  return `$${Number(p).toLocaleString('es-AR')}`
}

function Modal({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function AccionesLicencia({ contacto, loadingEmail, onDescargar, onEnviar }) {
  return (
    <div className="flex gap-3 mt-4">
      <button type="button" onClick={onDescargar}
        className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
        ⬇ Descargar .lic
      </button>
      <button type="button" onClick={onEnviar} disabled={loadingEmail || !contacto}
        className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
        {loadingEmail ? 'Enviando…' : '✉ Enviar por email'}
      </button>
    </div>
  )
}

const FORM_INICIAL       = { desde: fechaHoy(), hasta: '', notas: '', precio: '' }
const FORM_NUEVA_INICIAL = { machineId: '', nombreMaquina: '', desde: fechaHoy(), hasta: '', notas: '', precio: '' }


export default function DetallePeluqueria() {
  const router      = useRouter()
  const { isReady } = router
  const { nombre }  = router.query

  const [licencias, setLicencias]   = useState([])
  const [cargando, setCargando]     = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)
  const [copiadoId, setCopiadoId]   = useState(null)

  // Renovar
  const [mostrarForm, setMostrarForm]            = useState(false)
  const [machineIdSeleccionado, setMachineIdSel] = useState(null)
  const [nombreMaqSeleccionada, setNombreMaqSel] = useState(null)
  const [msg, setMsg]                            = useState(null)
  const [loadingGen, setLoadingGen]              = useState(false)
  const [loadingEmailRen, setLoadingEmailRen]    = useState(false)
  const [licRenovada, setLicRenovada]            = useState(null)
  const [form, setForm]                          = useState(FORM_INICIAL)

  // Nueva máquina
  const [mostrarFormNueva, setMostrarFormNueva]   = useState(false)
  const [msgNueva, setMsgNueva]                   = useState(null)
  const [loadingNueva, setLoadingNueva]           = useState(false)
  const [loadingEmailNueva, setLoadingEmailNueva] = useState(false)
  const [licNueva, setLicNueva]                   = useState(null)
  const [formNueva, setFormNueva]                 = useState(FORM_NUEVA_INICIAL)

  // Email historial
  const [emailHistorial, setEmailHistorial] = useState({})

  // Editar cliente
  const [modalEditar, setModalEditar]     = useState(false)
  const [formEditar, setFormEditar]       = useState({ nombre: '', contacto: '' })
  const [loadingEditar, setLoadingEditar] = useState(false)
  const [msgEditar, setMsgEditar]         = useState(null)

  // Eliminar cliente
  const [modalEliminarCliente, setModalEliminarCliente]     = useState(false)
  const [loadingEliminarCliente, setLoadingEliminarCliente] = useState(false)
  const [confirmTexto, setConfirmTexto]                     = useState('')

  // Eliminar licencia
  const [confirmEliminarLic, setConfirmEliminarLic] = useState(null)
  const [loadingEliminarLic, setLoadingEliminarLic] = useState(false)

  const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors'

  useEffect(() => {
    if (!sessionStorage.getItem('admin_auth')) router.push('/')
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!isReady || !nombre) return
    cargarLicencias()
  }, [isReady, nombre])

  useEffect(() => {
    if (licencias.length > 0)
      setFormEditar({ nombre: nombre || '', contacto: licencias[0]?.contacto || '' })
  }, [licencias, nombre])

  async function cargarLicencias() {
    setCargando(true); setErrorCarga(null)
    try {
      const auth = sessionStorage.getItem('admin_auth')
      const res  = await fetch(`/api/licencias?nombre=${encodeURIComponent(nombre)}`, {
        headers: { 'x-admin-auth': auth },
      })
      if (res.status === 401) { sessionStorage.clear(); router.push('/'); return }
      const data = await res.json()
      setLicencias(data || [])
    } catch {
      setErrorCarga('No se pudo conectar con el servidor. Revisá tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  function copiar(mid) {
    navigator.clipboard.writeText(mid)
    setCopiadoId(mid)
    setTimeout(() => setCopiadoId(null), 2000)
  }

  function descargarLic(lic) {
    const blob = new Blob([lic.lic_base64], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `licencia-${lic.peluqueria.replace(/\s+/g, '-')}-${lic.vence}.lic`
    a.click(); URL.revokeObjectURL(url)
  }

  function descargarGenerada(licData) {
    const blob = new Blob([licData.licBase64], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = licData.nombreArchivo; a.click()
    URL.revokeObjectURL(url)
  }

  async function enviarEmailLic(licData, setLoadingFn, setMsgFn) {
    setLoadingFn(true)
    try {
      const res = await fetch('/api/enviar-licencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': sessionStorage.getItem('admin_auth') },
        body: JSON.stringify({
          contacto: licencias[0]?.contacto, peluqueria: nombre,
          licBase64: licData.licBase64, nombreArchivo: licData.nombreArchivo, vence: licData.vence,
        }),
      })
      setMsgFn({ tipo: res.ok ? 'ok' : 'error', texto: res.ok ? `✅ Email enviado a ${licencias[0]?.contacto}` : 'Error al enviar el email' })
    } catch {
      setMsgFn({ tipo: 'error', texto: 'No se pudo conectar.' })
    } finally {
      setLoadingFn(false)
    }
  }

  async function enviarEmailHistorial(lic) {
    setEmailHistorial(prev => ({ ...prev, [lic.id]: 'loading' }))
    try {
      const res = await fetch('/api/enviar-licencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': sessionStorage.getItem('admin_auth') },
        body: JSON.stringify({
          contacto: licencias[0]?.contacto, peluqueria: nombre,
          licBase64: lic.lic_base64,
          nombreArchivo: `licencia-${nombre.replace(/\s+/g, '-')}-${lic.vence}.lic`,
          vence: lic.vence,
        }),
      })
      setEmailHistorial(prev => ({ ...prev, [lic.id]: res.ok ? 'ok' : 'error' }))
    } catch {
      setEmailHistorial(prev => ({ ...prev, [lic.id]: 'error' }))
    } finally {
      setTimeout(() => setEmailHistorial(prev => ({ ...prev, [lic.id]: null })), 3000)
    }
  }

  async function renovar(e) {
    e.preventDefault()
    setLoadingGen(true); setMsg(null); setLicRenovada(null)
    try {
      const res = await fetch('/api/generar-licencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': sessionStorage.getItem('admin_auth') },
        body: JSON.stringify({
          peluqueria: nombre, contacto: licencias[0]?.contacto || '',
          machineId: machineIdSeleccionado, nombreMaquina: nombreMaqSeleccionada,
          desde: form.desde, hasta: form.hasta, notas: form.notas, precio: form.precio,
          esNuevoCliente: false, esRenovacion: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setMsg({ tipo: 'error', texto: data.error })
      setLicRenovada({ licBase64: data.licBase64, nombreArchivo: data.nombreArchivo, vence: form.hasta })
      setMsg({ tipo: 'ok', texto: '✅ Licencia renovada correctamente' })
      cargarLicencias()
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo conectar.' })
    } finally {
      setLoadingGen(false)
    }
  }

  async function agregarMaquina(e) {
    e.preventDefault()
    setLoadingNueva(true); setMsgNueva(null); setLicNueva(null)
    try {
      const res = await fetch('/api/generar-licencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': sessionStorage.getItem('admin_auth') },
        body: JSON.stringify({
          peluqueria: nombre, contacto: licencias[0]?.contacto || '',
          machineId: formNueva.machineId, nombreMaquina: formNueva.nombreMaquina,
          desde: formNueva.desde, hasta: formNueva.hasta, notas: formNueva.notas, precio: formNueva.precio,
          esNuevoCliente: false, esRenovacion: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setMsgNueva({ tipo: 'error', texto: data.error })
      setLicNueva({ licBase64: data.licBase64, nombreArchivo: data.nombreArchivo, vence: formNueva.hasta })
      setMsgNueva({ tipo: 'ok', texto: '✅ Máquina agregada correctamente' })
      cargarLicencias()
    } catch {
      setMsgNueva({ tipo: 'error', texto: 'No se pudo conectar.' })
    } finally {
      setLoadingNueva(false)
    }
  }

  async function guardarEdicion(e) {
    e.preventDefault()
    setLoadingEditar(true); setMsgEditar(null)
    try {
      const res = await fetch('/api/licencias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': sessionStorage.getItem('admin_auth') },
        body: JSON.stringify({
          peluqueriaActual: nombre,
          peluqueriaNueva:  formEditar.nombre.trim(),
          contacto:         formEditar.contacto.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) return setMsgEditar({ tipo: 'error', texto: data.error })
      setMsgEditar({ tipo: 'ok', texto: '✅ Datos actualizados' })
      if (data.peluqueriaNueva && data.peluqueriaNueva !== nombre) {
        setTimeout(() => router.replace('/peluqueria/' + encodeURIComponent(data.peluqueriaNueva)), 1000)
      } else {
        cargarLicencias()
        setTimeout(() => { setModalEditar(false); setMsgEditar(null) }, 1200)
      }
    } catch {
      setMsgEditar({ tipo: 'error', texto: 'No se pudo conectar.' })
    } finally {
      setLoadingEditar(false)
    }
  }

  async function eliminarCliente() {
    setLoadingEliminarCliente(true)
    try {
      const res = await fetch(`/api/licencias?peluqueria=${encodeURIComponent(nombre)}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': sessionStorage.getItem('admin_auth') },
      })
      if (!res.ok) { const d = await res.json(); alert(d.error); return }
      router.push('/dashboard')
    } catch {
      alert('No se pudo eliminar el cliente.')
    } finally {
      setLoadingEliminarCliente(false)
    }
  }

  async function eliminarLicencia(id) {
    setLoadingEliminarLic(true)
    try {
      const res = await fetch(`/api/licencias?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': sessionStorage.getItem('admin_auth') },
      })
      if (!res.ok) { const d = await res.json(); alert(d.error); return }
      setConfirmEliminarLic(null)
      cargarLicencias()
    } catch {
      alert('No se pudo eliminar la licencia.')
    } finally {
      setLoadingEliminarLic(false)
    }
  }

  const maquinas = Object.entries(
    licencias.reduce((acc, lic) => {
      if (!acc[lic.machine_id]) acc[lic.machine_id] = []
      acc[lic.machine_id].push(lic)
      return acc
    }, {})
  ).map(([machineId, lics]) => {
    const ordenadas = [...lics].sort((a, b) => new Date(b.vence) - new Date(a.vence))
    return { machineId, licencias: ordenadas, ultima: ordenadas[0] }
  })

  const totalCobrado  = licencias.reduce((s, l) => s + (l.precio || 0), 0)
  const miembroDesde  = licencias.length ? licencias[licencias.length - 1]?.creada_en?.slice(0, 10) : null

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ── Modal: editar cliente ── */}
      {modalEditar && (
        <Modal onClose={() => { setModalEditar(false); setMsgEditar(null) }}>
          <h3 className="text-lg font-bold text-white mb-5">✏️ Editar cliente</h3>
          <form onSubmit={guardarEdicion} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Nombre de la peluquería *</label>
              <input className={inp} required value={formEditar.nombre}
                onChange={e => setFormEditar(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Contacto (email / WhatsApp)</label>
              <input className={inp} value={formEditar.contacto} placeholder="email@ejemplo.com o +54..."
                onChange={e => setFormEditar(f => ({ ...f, contacto: e.target.value }))} />
            </div>
            {msgEditar && (
              <p className={`text-sm ${msgEditar.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msgEditar.texto}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setModalEditar(false); setMsgEditar(null) }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={loadingEditar}
                className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
                {loadingEditar ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: eliminar cliente ── */}
      {modalEliminarCliente && (
        <Modal onClose={() => { setModalEliminarCliente(false); setConfirmTexto('') }}>
          <div className="text-center">
            <div className="text-5xl mb-4">🗑️</div>
            <h3 className="text-lg font-bold text-white mb-2">Eliminar cliente</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Se eliminarán <strong className="text-white">todas las licencias</strong> de{' '}
              <strong className="text-red-400">{nombre}</strong> de forma permanente.
            </p>
            <p className="text-zinc-500 text-xs mb-2">Escribí el nombre exacto para confirmar:</p>
            <input
              className={inp + ' text-center mb-5'}
              placeholder={nombre}
              value={confirmTexto}
              onChange={e => setConfirmTexto(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => { setModalEliminarCliente(false); setConfirmTexto('') }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
              <button
                onClick={eliminarCliente}
                disabled={confirmTexto !== nombre || loadingEliminarCliente}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
                {loadingEliminarCliente ? 'Eliminando…' : 'Eliminar todo'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: confirmar eliminar licencia ── */}
      {confirmEliminarLic && (
        <Modal onClose={() => setConfirmEliminarLic(null)}>
          <h3 className="text-base font-bold text-white mb-3">¿Eliminar esta licencia?</h3>
          <div className="bg-zinc-800 rounded-xl px-4 py-3 mb-4 text-sm">
            <p className="text-zinc-300">{confirmEliminarLic.desde} → {confirmEliminarLic.vence}</p>
            {confirmEliminarLic.precio != null && (
              <p className="text-zinc-500 text-xs mt-1">Precio registrado: {formatPrecio(confirmEliminarLic.precio)}</p>
            )}
          </div>
          <p className="text-zinc-500 text-xs mb-5">Esta acción es permanente y no se puede deshacer.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmEliminarLic(null)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl text-sm transition-colors">
              Cancelar
            </button>
            <button onClick={() => eliminarLicencia(confirmEliminarLic.id)} disabled={loadingEliminarLic}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
              {loadingEliminarLic ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Header ── */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-white transition-colors text-sm">
            ← Volver
          </button>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-300 font-medium flex-1">{nombre}</span>
          {!cargando && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFormEditar({ nombre: nombre || '', contacto: licencias[0]?.contacto || '' })
                  setModalEditar(true)
                }}
                className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors">
                ✏️ Editar
              </button>
              <button
                onClick={() => { setConfirmTexto(''); setModalEliminarCliente(true) }}
                className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 px-3 py-1.5 rounded-lg transition-colors">
                🗑 Eliminar cliente
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 fade-in">

        {errorCarga && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
            <span>{errorCarga}</span>
            <button onClick={cargarLicencias} className="underline hover:no-underline ml-4">Reintentar</button>
          </div>
        )}

        {cargando ? (
          <div className="text-zinc-600 text-sm">Cargando…</div>
        ) : (
          <>
            {/* ── Card cliente + stats ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-white">{nombre}</h1>
                  <p className="text-zinc-500 text-sm mt-1">
                    {licencias[0]?.contacto || <span className="italic text-zinc-600">Sin contacto registrado</span>}
                  </p>
                  {miembroDesde && (
                    <p className="text-zinc-600 text-xs mt-1">Cliente desde {miembroDesde}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-zinc-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{maquinas.length}</div>
                  <div className="text-xs text-zinc-500 mt-1">Máquina{maquinas.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{licencias.length}</div>
                  <div className="text-xs text-zinc-500 mt-1">Licencias emitidas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-400">
                    {totalCobrado > 0 ? formatPrecio(totalCobrado) : '—'}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Total cobrado</div>
                </div>
              </div>
            </div>

            {/* ── Form renovar ── */}
            {mostrarForm && (
              <form onSubmit={renovar} className="bg-zinc-900 border border-violet-500/20 rounded-2xl p-6 mb-6 fade-in">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-semibold text-violet-400">Renovar licencia</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {nombreMaqSeleccionada
                        ? <><span className="text-white">{nombreMaqSeleccionada}</span> · <code className="text-violet-400">{machineIdSeleccionado?.substring(0, 16)}…</code></>
                        : <code className="text-violet-400">{machineIdSeleccionado?.substring(0, 20)}…</code>
                      }
                    </p>
                  </div>
                  <button type="button" onClick={() => {
                    setMostrarForm(false); setMachineIdSel(null)
                    setNombreMaqSel(null); setLicRenovada(null); setMsg(null)
                  }} className="text-zinc-600 hover:text-white text-sm">✕ Cancelar</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Desde *</label>
                    <input type="date" className={inp} required value={form.desde}
                      onChange={e => setForm(f => ({ ...f, desde: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Vence *</label>
                    <input type="date" className={inp} required value={form.hasta} min={form.desde}
                      onChange={e => setForm(f => ({ ...f, hasta: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Precio cobrado ($)</label>
                    <input type="number" min="0" className={inp} value={form.precio} placeholder="Ej: 20000"
                      onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Notas internas</label>
                    <input className={inp} value={form.notas} placeholder="Ej: renovación 3 meses"
                      onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
                  </div>
                </div>
                {msg && <p className={`mt-3 text-sm ${msg.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msg.texto}</p>}
                {licRenovada ? (
                  <AccionesLicencia contacto={licencias[0]?.contacto} loadingEmail={loadingEmailRen}
                    onDescargar={() => descargarGenerada(licRenovada)}
                    onEnviar={() => enviarEmailLic(licRenovada, setLoadingEmailRen, setMsg)} />
                ) : (
                  <button type="submit" disabled={loadingGen}
                    className="mt-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">
                    {loadingGen ? 'Generando…' : 'Generar renovación'}
                  </button>
                )}
              </form>
            )}

            {/* ── Form nueva máquina ── */}
            <div className="mb-6">
              {!mostrarFormNueva ? (
                <button onClick={() => setMostrarFormNueva(true)}
                  className="text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-xl transition-colors">
                  + Agregar máquina
                </button>
              ) : (
                <form onSubmit={agregarMaquina} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 fade-in">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-semibold text-white">Nueva máquina</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Cliente: {nombre} · {licencias[0]?.contacto}</p>
                    </div>
                    <button type="button" onClick={() => { setMostrarFormNueva(false); setLicNueva(null); setMsgNueva(null) }}
                      className="text-zinc-600 hover:text-white text-sm">✕ Cancelar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs text-zinc-400 mb-1.5 block">Nombre descriptivo de la PC</label>
                      <input className={inp} value={formNueva.nombreMaquina}
                        placeholder="Ej: PC Principal, Sucursal Centro, Notebook"
                        onChange={e => setFormNueva(f => ({ ...f, nombreMaquina: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-zinc-400 mb-1.5 block">Machine ID *</label>
                      <input className={inp} required value={formNueva.machineId}
                        placeholder="ID que te mandó el cliente"
                        onChange={e => setFormNueva(f => ({ ...f, machineId: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">Desde *</label>
                      <input type="date" className={inp} required value={formNueva.desde}
                        onChange={e => setFormNueva(f => ({ ...f, desde: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">Vence *</label>
                      <input type="date" className={inp} required value={formNueva.hasta} min={formNueva.desde}
                        onChange={e => setFormNueva(f => ({ ...f, hasta: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">Precio cobrado ($)</label>
                      <input type="number" min="0" className={inp} value={formNueva.precio} placeholder="Ej: 20000"
                        onChange={e => setFormNueva(f => ({ ...f, precio: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">Notas internas</label>
                      <input className={inp} value={formNueva.notas} placeholder="Ej: segunda sucursal"
                        onChange={e => setFormNueva(f => ({ ...f, notas: e.target.value }))} />
                    </div>
                  </div>
                  {msgNueva && <p className={`mt-3 text-sm ${msgNueva.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msgNueva.texto}</p>}
                  {licNueva ? (
                    <AccionesLicencia contacto={licencias[0]?.contacto} loadingEmail={loadingEmailNueva}
                      onDescargar={() => descargarGenerada(licNueva)}
                      onEnviar={() => enviarEmailLic(licNueva, setLoadingEmailNueva, setMsgNueva)} />
                  ) : (
                    <button type="submit" disabled={loadingNueva}
                      className="mt-4 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                      {loadingNueva ? 'Generando…' : 'Generar licencia'}
                    </button>
                  )}
                </form>
              )}
            </div>

            {/* ── Máquinas ── */}
            <h2 className="text-xs font-semibold text-zinc-500 mb-3 uppercase tracking-widest">
              Máquinas registradas
            </h2>

            {maquinas.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-600 text-sm">
                No hay máquinas registradas para este cliente.
              </div>
            ) : (
              <div className="space-y-4">
                {maquinas.map((maq, i) => {
                  const estado = getEstado(maq.ultima.vence)
                  return (
                    <div key={maq.machineId} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">

                      {/* Machine header */}
                      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                        <div>
                          <p className="text-xs text-zinc-600 mb-1">Máquina {i + 1}</p>
                          <p className="text-white font-semibold text-base mb-2">
                            {maq.ultima.nombre_maquina || <span className="text-zinc-500 font-normal italic">Sin nombre</span>}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-violet-400 text-xs bg-violet-400/10 px-3 py-1.5 rounded-lg break-all">
                              {maq.machineId}
                            </code>
                            <button onClick={() => copiar(maq.machineId)}
                              className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                              {copiadoId === maq.machineId ? '✓ Copiado' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${estado.bg} ${estado.border} ${estado.text}`}>
                            {estado.label}
                          </span>
                          <div className={`text-2xl font-bold mt-1 ${estado.text}`}>
                            {estado.dias < 0 ? `Venció hace ${Math.abs(estado.dias)}d` : `${estado.dias} días`}
                          </div>
                          <div className="text-zinc-600 text-xs">Vence: {maq.ultima.vence}</div>
                        </div>
                      </div>

                      {/* Botón renovar */}
                      {!mostrarForm && (
                        <button onClick={() => {
                          setMachineIdSel(maq.machineId)
                          setNombreMaqSel(maq.ultima.nombre_maquina || null)
                          setMostrarForm(true); setLicRenovada(null); setMsg(null)
                          setForm(FORM_INICIAL)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                          className="text-xs text-violet-400 hover:text-violet-300 border border-violet-400/30 hover:border-violet-400/60 px-3 py-1.5 rounded-lg transition-colors mb-5">
                          ↻ Renovar esta máquina
                        </button>
                      )}

                      {/* Historial de pagos */}
                      <div>
                        <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">
                          Historial · {maq.licencias.length} emisión{maq.licencias.length !== 1 ? 'es' : ''}
                          {maq.licencias.some(l => l.precio) && (
                            <span className="text-violet-400 ml-2">
                              · {formatPrecio(maq.licencias.reduce((s, l) => s + (l.precio || 0), 0))} total
                            </span>
                          )}
                        </p>
                        <div className="space-y-1.5">
                          {maq.licencias.map((lic, j) => {
                            const est        = getEstado(lic.vence)
                            const emailState = emailHistorial[lic.id]
                            return (
                              <div key={lic.id}
                                className="bg-zinc-800/50 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">

                                {/* Badge */}
                                <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
                                  j === 0
                                    ? 'bg-zinc-700 border-zinc-600 text-zinc-300'
                                    : 'border-zinc-700/50 text-zinc-600'
                                }`}>
                                  {j === 0 ? 'Actual' : `#${maq.licencias.length - j}`}
                                </span>

                                {/* Fechas */}
                                <span className="text-sm text-zinc-200 flex-1 min-w-[150px]">
                                  {lic.desde} → {lic.vence}
                                </span>

                                {/* Precio */}
                                <span className={`text-sm font-semibold ${lic.precio ? 'text-green-400' : 'text-zinc-600'}`}>
                                  {formatPrecio(lic.precio)}
                                </span>

                                {/* Estado */}
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${est.bg} ${est.border} ${est.text}`}>
                                  {est.label}
                                </span>

                                {/* Notas */}
                                {lic.notas && (
                                  <span className="text-xs text-zinc-600 hidden md:inline">{lic.notas}</span>
                                )}

                                {/* Acciones */}
                                <div className="flex items-center gap-1.5 ml-auto">
                                  <button onClick={() => descargarLic(lic)} title="Descargar .lic"
                                    className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2.5 py-1.5 rounded-lg transition-colors">
                                    ⬇
                                  </button>
                                  {licencias[0]?.contacto && (
                                    <button onClick={() => enviarEmailHistorial(lic)} disabled={emailState === 'loading'}
                                      title="Enviar por email"
                                      className="text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50 border border-violet-400/30 hover:border-violet-400/60 px-2.5 py-1.5 rounded-lg transition-colors">
                                      {emailState === 'loading' ? '…' : emailState === 'ok' ? '✓' : emailState === 'error' ? '✗' : '✉'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setConfirmEliminarLic({ id: lic.id, desde: lic.desde, vence: lic.vence, precio: lic.precio })}
                                    title="Eliminar licencia"
                                    className="text-xs text-red-400/50 hover:text-red-400 border border-red-500/20 hover:border-red-500/50 px-2.5 py-1.5 rounded-lg transition-colors">
                                    🗑
                                  </button>
                                </div>

                              </div>
                            )
                          })}
                        </div>
                      </div>

                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
