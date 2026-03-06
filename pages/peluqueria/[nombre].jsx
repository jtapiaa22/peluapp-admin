import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'


// ─── Helpers ────────────────────────────────────────────────────────────────

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
  if (dias < 0)   return { label: 'Vencida',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    dot: 'bg-red-400',              dias }
  if (dias <= 15) return { label: 'Por vencer', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400 pulse-soft', dias }
  return            { label: 'Activa',      bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',  dot: 'bg-green-400',            dias }
}

function formatPrecio(n) {
  return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

// ─── Modal wrapper ───────────────────────────────────────────────────────────

function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {children}
      </div>
    </div>
  )
}


// ─── Página ──────────────────────────────────────────────────────────────────

const FORM_INICIAL = {
  machineId:     '',
  nombreMaquina: '',
  desde:         fechaHoy(),
  hasta:         '',
  notas:         '',
  precio:        '',
}

export default function DetallePeluqueria() {
  const router  = useRouter()
  const { nombre } = router.query
  const isReady    = router.isReady

  const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors'

  // ── Estado principal ──────────────────────────────────────────────────────
  const [licencias,        setLicencias]        = useState([])
  const [pagos,            setPagos]            = useState([])
  const [cargando,         setCargando]         = useState(true)
  const [errorCarga,       setErrorCarga]       = useState(null)

  // Renovar
  const [mostrarForm,      setMostrarForm]      = useState(false)
  const [form,             setForm]             = useState(FORM_INICIAL)
  const [machineIdSel,     setMachineIdSel]     = useState('')
  const [nombreMaqSel,     setNombreMaqSel]     = useState(null)
  const [loading,          setLoading]          = useState(false)
  const [msg,              setMsg]              = useState(null)
  const [licRenovada,      setLicRenovada]      = useState(null)

  // Agregar máquina
  const [modalNuevaMaq,    setModalNuevaMaq]    = useState(false)
  const [formNueva,        setFormNueva]        = useState(FORM_INICIAL)
  const [loadingNueva,     setLoadingNueva]     = useState(false)
  const [msgNueva,         setMsgNueva]         = useState(null)
  const [licNueva,         setLicNueva]         = useState(null)

  // Editar cliente
  const [modalEditar,      setModalEditar]      = useState(false)
  const [formEditar,       setFormEditar]       = useState({ nombre: '', contacto: '', telefono: '' })
  const [loadingEditar,    setLoadingEditar]    = useState(false)
  const [msgEditar,        setMsgEditar]        = useState(null)

  // Pagos
  const [modalPago,        setModalPago]        = useState(false)
  const [formPago,         setFormPago]         = useState({ monto: '', pagado_en: fechaHoy(), metodo: 'Transferencia', nota: '' })
  const [loadingPago,      setLoadingPago]      = useState(false)
  const [msgPago,          setMsgPago]          = useState(null)

  // Eliminar
  const [confirmEliminarCliente, setConfirmEliminarCliente] = useState(false)
  const [loadingEliminarCliente, setLoadingEliminarCliente] = useState(false)
  const [confirmEliminarLic,     setConfirmEliminarLic]     = useState(null)
  const [loadingEliminarLic,     setLoadingEliminarLic]     = useState(false)

  // Copiar Machine ID
  const [copiadoId, setCopiadoId] = useState(null)

  // Email historial
  const [emailHistorial, setEmailHistorial] = useState({})

  useEffect(() => {
    if (!sessionStorage.getItem('admin_auth')) router.push('/')
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!isReady || !nombre) return
    cargarTodo()
  }, [isReady, nombre]) // eslint-disable-line

  useEffect(() => {
    if (licencias.length > 0)
      setFormEditar({
        nombre:          nombre || '',
        contacto:        licencias[0]?.contacto        || '',
        telefono:        licencias[0]?.telefono        || '',
        nombre_contacto: licencias[0]?.nombre_contacto || '',
      })
  }, [licencias, nombre])

  async function cargarTodo() {
    setCargando(true); setErrorCarga(null)
    const auth = sessionStorage.getItem('admin_auth')
    try {
      const [resLic, resPagos] = await Promise.all([
        fetch(`/api/licencias?nombre=${encodeURIComponent(nombre)}`, { headers: { 'x-admin-auth': auth } }),
        fetch(`/api/pagos?peluqueria=${encodeURIComponent(nombre)}`, { headers: { 'x-admin-auth': auth } }),
      ])
      if (resLic.status === 401) { sessionStorage.clear(); router.push('/'); return }
      setLicencias(await resLic.json() || [])
      setPagos(resPagos.ok ? (await resPagos.json() || []) : [])
    } catch {
      setErrorCarga('No se pudo conectar con el servidor.')
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

  // ── Renovar ───────────────────────────────────────────────────────────────
  async function renovar(e) {
    e.preventDefault()
    setLoading(true); setMsg(null); setLicRenovada(null)
    try {
      const res = await fetch('/api/generar-licencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': sessionStorage.getItem('admin_auth') },
        body: JSON.stringify({
          peluqueria: nombre, contacto: licencias[0]?.contacto || '',
          machineId: machineIdSel, nombreMaquina: nombreMaqSel,
          desde: form.desde, hasta: form.hasta, notas: form.notas, precio: form.precio,
          esNuevoCliente: false, esRenovacion: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setMsg({ tipo: 'error', texto: data.error })
      setLicRenovada({ licBase64: data.licBase64, nombreArchivo: data.nombreArchivo, vence: form.hasta })
      setMsg({ tipo: 'ok', texto: '✅ Licencia renovada correctamente' })
      cargarTodo()
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo conectar.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Agregar máquina ───────────────────────────────────────────────────────
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
      cargarTodo()
    } catch {
      setMsgNueva({ tipo: 'error', texto: 'No se pudo conectar.' })
    } finally {
      setLoadingNueva(false)
    }
  }

  // ── Editar cliente ────────────────────────────────────────────────────────
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
          telefono:         formEditar.telefono.trim(),
          nombre_contacto:  formEditar.nombre_contacto.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) return setMsgEditar({ tipo: 'error', texto: data.error })
      setMsgEditar({ tipo: 'ok', texto: '✅ Datos actualizados' })
      if (data.peluqueriaNueva && data.peluqueriaNueva !== nombre) {
        setTimeout(() => router.replace('/peluqueria/' + encodeURIComponent(data.peluqueriaNueva)), 1000)
      } else {
        cargarTodo()
        setTimeout(() => { setModalEditar(false); setMsgEditar(null) }, 1200)
      }
    } catch {
      setMsgEditar({ tipo: 'error', texto: 'No se pudo conectar.' })
    } finally {
      setLoadingEditar(false)
    }
  }

  // ── Registrar pago ────────────────────────────────────────────────────────
  async function registrarPago(e) {
    e.preventDefault()
    setLoadingPago(true); setMsgPago(null)
    try {
      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': sessionStorage.getItem('admin_auth') },
        body: JSON.stringify({ peluqueria: nombre, ...formPago }),
      })
      const data = await res.json()
      if (!res.ok) return setMsgPago({ tipo: 'error', texto: data.error })
      setMsgPago({ tipo: 'ok', texto: '✅ Cobro registrado' })
      setPagos(prev => [data, ...prev])
      setTimeout(() => { setModalPago(false); setMsgPago(null); setFormPago({ monto: '', pagado_en: fechaHoy(), metodo: 'Transferencia', nota: '' }) }, 1000)
    } catch {
      setMsgPago({ tipo: 'error', texto: 'No se pudo conectar.' })
    } finally {
      setLoadingPago(false)
    }
  }

  async function eliminarPago(id) {
    if (!confirm('¿Eliminar este cobro?')) return
    await fetch(`/api/pagos?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-auth': sessionStorage.getItem('admin_auth') },
    })
    setPagos(prev => prev.filter(p => p.id !== id))
  }

  // ── Eliminar cliente ──────────────────────────────────────────────────────
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
      cargarTodo()
    } catch {
      alert('No se pudo eliminar la licencia.')
    } finally {
      setLoadingEliminarLic(false)
    }
  }

  // ── Agrupaciones ─────────────────────────────────────────────────────────
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

  const totalCobrado  = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const miembroDesde  = licencias.length ? licencias[licencias.length - 1]?.creada_en?.slice(0, 10) : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ── Modal: editar cliente ── */}
      {modalEditar && (
        <Modal onClose={() => { setModalEditar(false); setMsgEditar(null) }}>
          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-5">✏️ Editar cliente</h3>
            <form onSubmit={guardarEdicion} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Nombre de la peluquería *</label>
                <input className={inp} required value={formEditar.nombre}
                  onChange={e => setFormEditar(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Nombre de la persona</label>
                <input className={inp} value={formEditar.nombre_contacto}
                  placeholder="Ej: Joaquín Jofre"
                  onChange={e => setFormEditar(f => ({ ...f, nombre_contacto: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Email</label>
                  <input className={inp} type="email" value={formEditar.contacto}
                    placeholder="email@ejemplo.com"
                    onChange={e => setFormEditar(f => ({ ...f, contacto: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Teléfono / WhatsApp</label>
                  <input className={inp} type="tel" value={formEditar.telefono}
                    placeholder="+54 9 11..."
                    onChange={e => setFormEditar(f => ({ ...f, telefono: e.target.value }))} />
                </div>
              </div>
              {msgEditar && (
                <p className={`text-sm px-3 py-2 rounded-lg ${
                  msgEditar.tipo === 'ok'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>{msgEditar.texto}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalEditar(false); setMsgEditar(null) }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loadingEditar}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
                  {loadingEditar ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── Modal: registrar cobro ── */}
      {modalPago && (
        <Modal onClose={() => { setModalPago(false); setMsgPago(null) }}>
          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-1">💰 Registrar cobro</h3>
            <p className="text-zinc-500 text-sm mb-5">Anotá cuándo y cuánto te pagó <strong className="text-white">{nombre}</strong></p>
            <form onSubmit={registrarPago} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Monto ($) *</label>
                  <input className={inp} required type="number" min="1" step="0.01"
                    value={formPago.monto} placeholder="Ej: 15000"
                    onChange={e => setFormPago(f => ({ ...f, monto: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Fecha de pago *</label>
                  <input className={inp} required type="date"
                    value={formPago.pagado_en}
                    onChange={e => setFormPago(f => ({ ...f, pagado_en: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Método</label>
                <select className={inp} value={formPago.metodo}
                  onChange={e => setFormPago(f => ({ ...f, metodo: e.target.value }))}>
                  <option>Transferencia</option>
                  <option>Efectivo</option>
                  <option>MercadoPago</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Nota (opcional)</label>
                <input className={inp} value={formPago.nota}
                  placeholder="Ej: pago del mes de marzo, renovación..."
                  onChange={e => setFormPago(f => ({ ...f, nota: e.target.value }))} />
              </div>
              {msgPago && (
                <p className={`text-sm px-3 py-2 rounded-lg ${
                  msgPago.tipo === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>{msgPago.texto}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalPago(false); setMsgPago(null) }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loadingPago}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
                  {loadingPago ? 'Guardando…' : '✓ Registrar cobro'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── Modal: confirmar eliminar cliente ── */}
      {confirmEliminarCliente && (
        <Modal onClose={() => setConfirmEliminarCliente(false)}>
          <div className="p-6">
            <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ Eliminar cliente</h3>
            <p className="text-zinc-400 text-sm mb-5">
              Vas a eliminar <strong className="text-white">{nombre}</strong> y todas sus licencias y cobros. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEliminarCliente(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={eliminarCliente} disabled={loadingEliminarCliente}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
                {loadingEliminarCliente ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: confirmar eliminar licencia ── */}
      {confirmEliminarLic && (
        <Modal onClose={() => setConfirmEliminarLic(null)}>
          <div className="p-6">
            <h3 className="text-lg font-bold text-red-400 mb-2">Eliminar licencia</h3>
            <p className="text-zinc-400 text-sm mb-5">¿Confirmar eliminación de esta licencia?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEliminarLic(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={() => eliminarLicencia(confirmEliminarLic)} disabled={loadingEliminarLic}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
                {loadingEliminarLic ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: agregar máquina ── */}
      {modalNuevaMaq && (
        <Modal onClose={() => { setModalNuevaMaq(false); setMsgNueva(null); setLicNueva(null); setFormNueva(FORM_INICIAL) }}>
          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-5">➕ Agregar máquina</h3>
            <form onSubmit={agregarMaquina} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Machine ID *</label>
                  <input className={inp} required value={formNueva.machineId} placeholder="ID único"
                    onChange={e => setFormNueva(f => ({ ...f, machineId: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Nombre máquina</label>
                  <input className={inp} value={formNueva.nombreMaquina} placeholder="Ej: PC Caja"
                    onChange={e => setFormNueva(f => ({ ...f, nombreMaquina: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Desde *</label>
                  <input className={inp} required type="date" value={formNueva.desde}
                    onChange={e => setFormNueva(f => ({ ...f, desde: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Hasta *</label>
                  <input className={inp} required type="date" value={formNueva.hasta}
                    onChange={e => setFormNueva(f => ({ ...f, hasta: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Precio ($)</label>
                  <input className={inp} type="number" min="0" value={formNueva.precio} placeholder="Opcional"
                    onChange={e => setFormNueva(f => ({ ...f, precio: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Notas</label>
                  <input className={inp} value={formNueva.notas} placeholder="Opcional"
                    onChange={e => setFormNueva(f => ({ ...f, notas: e.target.value }))} />
                </div>
              </div>
              {msgNueva && (
                <p className={`text-sm px-3 py-2 rounded-lg ${
                  msgNueva.tipo === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>{msgNueva.texto}</p>
              )}
              {licNueva ? (
                <div className="flex gap-3">
                  <button type="button" onClick={() => descargarGenerada(licNueva)}
                    className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-xl text-sm">
                    ⬇ Descargar .lic
                  </button>
                  <button type="button" disabled={!licencias[0]?.contacto}
                    onClick={() => enviarEmailLic(licNueva, setLoadingNueva, setMsgNueva)}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm">
                    ✉ Enviar email
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setModalNuevaMaq(false); setFormNueva(FORM_INICIAL) }}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loadingNueva}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm">
                    {loadingNueva ? 'Generando…' : 'Generar licencia'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </Modal>
      )}

      {/* ── Header ── */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-white transition-colors text-sm">
            ← Dashboard
          </button>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-300 font-medium truncate">{nombre}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {errorCarga ? (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            {errorCarga}
          </div>
        ) : cargando ? (
          <div className="text-zinc-600 text-sm">Cargando…</div>
        ) : (
          <>
            {/* ── Card cliente + stats ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-white">{nombre}</h1>
                  <div className="flex flex-col gap-1 mt-1">
                    {licencias[0]?.nombre_contacto && (
                      <p className="text-zinc-300 text-sm font-medium">👤 {licencias[0].nombre_contacto}</p>
                    )}
                    {licencias[0]?.contacto && (
                      <p className="text-zinc-500 text-sm">✉ {licencias[0].contacto}</p>
                    )}
                    {licencias[0]?.telefono && (
                      <p className="text-zinc-500 text-sm">📞 {licencias[0].telefono}</p>
                    )}
                    {!licencias[0]?.contacto && !licencias[0]?.telefono && (
                      <p className="text-zinc-600 text-sm italic">Sin datos de contacto</p>
                    )}
                  </div>
                  {miembroDesde && (
                    <p className="text-zinc-600 text-xs mt-1.5">Cliente desde {miembroDesde}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModalEditar(true)}
                    className="text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 text-xs px-3 py-1.5 rounded-lg transition-colors">
                    ✏️ Editar
                  </button>
                  <button onClick={() => setConfirmEliminarCliente(true)}
                    className="text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700/50 text-xs px-3 py-1.5 rounded-lg transition-colors">
                    🗑 Eliminar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-zinc-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{maquinas.length}</div>
                  <div className="text-xs text-zinc-500 mt-1">Máquina{maquinas.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{licencias.length}</div>
                  <div className="text-xs text-zinc-500 mt-1">Licencias emitidas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-400">{pagos.length}</div>
                  <div className="text-xs text-zinc-500 mt-1">Cobros registrados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {totalCobrado > 0 ? formatPrecio(totalCobrado) : '—'}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Total cobrado</div>
                </div>
              </div>
            </div>

            {/* ── Sección: Cobros ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-semibold text-white">💰 Cobros</h2>
                  <p className="text-zinc-600 text-xs mt-0.5">Registrá los pagos reales, independientemente de la licencia</p>
                </div>
                <button onClick={() => setModalPago(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  + Registrar cobro
                </button>
              </div>

              {pagos.length === 0 ? (
                <div className="text-center py-8 text-zinc-600">
                  <div className="text-3xl mb-2">💸</div>
                  <p className="text-sm">Todavía no hay cobros registrados para este cliente.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pagos.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-zinc-800/60 rounded-xl px-4 py-3 group">
                      <div>
                        <div className="text-white text-sm font-medium">{p.pagado_en}</div>
                        <div className="text-zinc-500 text-xs mt-0.5">
                          {p.metodo}{p.nota ? ` · ${p.nota}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold">{formatPrecio(p.monto)}</span>
                        <button onClick={() => eliminarPago(p.id)}
                          className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Form renovar ── */}
            {mostrarForm && (
              <form onSubmit={renovar} className="bg-zinc-900 border border-violet-500/20 rounded-2xl p-6 mb-6 fade-in">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-semibold text-violet-400">Renovar licencia</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {nombreMaqSel ? `Máquina: ${nombreMaqSel}` : `Machine ID: ${machineIdSel}`}
                    </p>
                  </div>
                  <button type="button" onClick={() => { setMostrarForm(false); setMsg(null); setLicRenovada(null) }}
                    className="text-zinc-600 hover:text-white text-sm">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Desde *</label>
                    <input className={inp} required type="date" value={form.desde}
                      onChange={e => setForm(f => ({ ...f, desde: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Hasta *</label>
                    <input className={inp} required type="date" value={form.hasta}
                      onChange={e => setForm(f => ({ ...f, hasta: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Precio ($)</label>
                    <input className={inp} type="number" min="0" value={form.precio} placeholder="Opcional"
                      onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Notas</label>
                    <input className={inp} value={form.notas} placeholder="Opcional"
                      onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
                  </div>
                </div>
                {msg && (
                  <div className={`text-sm px-3 py-2 rounded-lg mb-4 ${
                    msg.tipo === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>{msg.texto}</div>
                )}
                {licRenovada ? (
                  <div className="flex gap-3">
                    <button type="button" onClick={() => descargarGenerada(licRenovada)}
                      className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-xl text-sm">
                      ⬇ Descargar .lic
                    </button>
                    <button type="button" disabled={!licencias[0]?.contacto}
                      onClick={() => enviarEmailLic(licRenovada, setLoading, setMsg)}
                      className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm">
                      ✉ Enviar email
                    </button>
                  </div>
                ) : (
                  <button type="submit" disabled={loading}
                    className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm">
                    {loading ? 'Renovando…' : 'Renovar licencia'}
                  </button>
                )}
              </form>
            )}

            {/* ── Máquinas ── */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">🖥 Máquinas</h2>
              <button onClick={() => { setModalNuevaMaq(true); setFormNueva(FORM_INICIAL); setMsgNueva(null); setLicNueva(null) }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
                + Agregar máquina
              </button>
            </div>

            {maquinas.map(maq => {
              const estado       = getEstado(maq.ultima.vence)
              const totalMaqPago = maq.licencias.reduce((s, l) => s + (l.precio || 0), 0)

              return (
                <div key={maq.machineId} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-white">
                        {maq.ultima.nombre_maquina || 'Máquina sin nombre'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-zinc-500 text-xs bg-zinc-800 px-2 py-0.5 rounded font-mono">
                          {maq.machineId}
                        </code>
                        <button onClick={() => copiar(maq.machineId)}
                          className="text-zinc-600 hover:text-zinc-300 text-xs transition-colors">
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

                  {/* Historial de emisiones */}
                  <div>
                    <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">
                      Historial · {maq.licencias.length} emisión{maq.licencias.length !== 1 ? 'es' : ''}
                      {totalMaqPago > 0 && (
                        <span className="text-violet-400 ml-2">· {formatPrecio(totalMaqPago)} precio total</span>
                      )}
                    </p>
                    <div className="space-y-1.5">
                      {maq.licencias.map((lic, j) => {
                        const est        = getEstado(lic.vence)
                        const emailState = emailHistorial[lic.id]
                        return (
                          <div key={lic.id}
                            className="bg-zinc-800/50 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">

                            {/* Badge vigente/histórica */}
                            <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
                              j === 0
                                ? `${est.bg} ${est.border} ${est.text}`
                                : 'bg-zinc-800 border-zinc-700 text-zinc-600'
                            }`}>
                              {j === 0 ? est.label : 'Histórica'}
                            </span>

                            {/* Fechas */}
                            <span className="text-zinc-400 text-xs">{lic.desde} → {lic.vence}</span>

                            {/* Precio */}
                            {lic.precio > 0 && (
                              <span className="text-zinc-500 text-xs">{formatPrecio(lic.precio)}</span>
                            )}

                            {/* Notas */}
                            {lic.notas && (
                              <span className="text-zinc-600 text-xs italic truncate max-w-[180px]">{lic.notas}</span>
                            )}

                            {/* Acciones */}
                            <div className="ml-auto flex items-center gap-2">
                              <button onClick={() => descargarLic(lic)}
                                className="text-zinc-500 hover:text-white text-xs transition-colors">
                                ⬇ .lic
                              </button>
                              {licencias[0]?.contacto && (
                                <button
                                  disabled={emailState?.loading}
                                  onClick={async () => {
                                    setEmailHistorial(prev => ({ ...prev, [lic.id]: { loading: true } }))
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
                                      setEmailHistorial(prev => ({ ...prev, [lic.id]: { msg: res.ok ? '✅ Enviado' : '❌ Error' } }))
                                    } catch {
                                      setEmailHistorial(prev => ({ ...prev, [lic.id]: { msg: '❌ Error' } }))
                                    }
                                  }}
                                  className="text-zinc-500 hover:text-violet-400 text-xs transition-colors disabled:opacity-50">
                                  {emailState?.loading ? '…' : emailState?.msg || '✉'}
                                </button>
                              )}
                              <button onClick={() => setConfirmEliminarLic(lic.id)}
                                className="text-zinc-700 hover:text-red-400 text-xs transition-colors">✕</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
