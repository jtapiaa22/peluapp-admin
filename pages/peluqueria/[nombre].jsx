import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  ArrowLeft, Pencil, Trash2, Wallet, Coins, Inbox, Smartphone, MonitorSmartphone,
  Copy, Check, Download, Mail, RotateCw, Plus, X, TriangleAlert, User, Phone, AtSign,
} from 'lucide-react'
import { Shell, TopBar, Main, BackLink } from '@/components/Layout'
import { Badge, Card, Field, Input, Select, Alert, Button, Modal } from '@/components/ui'
import { getEstado, formatPrecio } from '@/lib/format'


function fechaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

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
  const [solicitudId,      setSolicitudId]      = useState(null)

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

  // Panel de turnos (clave del /admin de peluapp-web)
  const [panelPeluquerias, setPanelPeluquerias] = useState([])
  const [panelSel,         setPanelSel]         = useState('')
  const [panelClave,       setPanelClave]       = useState('')
  const [panelMsg,         setPanelMsg]         = useState(null)
  const [panelLoading,     setPanelLoading]     = useState(false)
  const [panelCopiado,     setPanelCopiado]     = useState(false)

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

  // Llega desde el botón "Activar" de la pestaña Solicitudes del dashboard: precarga el form de
  // renovar (misma máquina) o el modal de agregar máquina (cliente conocido, máquina nueva), y
  // guarda el solicitudId para que generar-licencia.js marque la solicitud como resuelta.
  useEffect(() => {
    if (!isReady || licencias.length === 0) return
    const { solicitudId: sid, machineId: mid, agregarMaquina: addFlag, nombreMaquina: nmaq } = router.query
    if (!sid) return
    setSolicitudId(sid)
    if (addFlag) {
      setFormNueva(f => ({ ...f, machineId: mid || '', nombreMaquina: nmaq || '' }))
      setModalNuevaMaq(true)
    } else if (mid) {
      const lic = licencias.find(l => l.machine_id === mid)
      setMachineIdSel(mid)
      setNombreMaqSel(lic?.nombre_maquina || null)
      setMostrarForm(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [isReady, licencias]) // eslint-disable-line react-hooks/exhaustive-deps

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
    cargarPanelTurnos()
  }

  // ── Panel de turnos ───────────────────────────────────────────────────────
  async function cargarPanelTurnos() {
    try {
      const auth = sessionStorage.getItem('admin_auth')
      const r = await fetch(`/api/panel-turnos?nombre=${encodeURIComponent(nombre)}`, {
        headers: { 'x-admin-auth': auth },
      })
      if (!r.ok) return
      const d = await r.json()
      setPanelPeluquerias(d.peluquerias || [])
      // Si hay una sola coincidencia, la elegimos sola.
      if ((d.peluquerias || []).length === 1) setPanelSel(d.peluquerias[0].id)
    } catch {}
  }

  function generarClave() {
    // Sin caracteres ambiguos (0/O, 1/l): se la va a dictar por teléfono.
    const abc = 'abcdefghijkmnpqrstuvwxyz23456789'
    let s = ''
    for (let i = 0; i < 10; i++) s += abc[Math.floor(Math.random() * abc.length)]
    setPanelClave(s)
    setPanelMsg(null)
  }

  async function guardarClavePanel(e) {
    e.preventDefault()
    if (!panelSel) { setPanelMsg({ tipo: 'error', texto: 'Elegí la peluquería.' }); return }
    if (panelClave.length < 6) { setPanelMsg({ tipo: 'error', texto: 'Mínimo 6 caracteres.' }); return }

    setPanelLoading(true); setPanelMsg(null)
    try {
      const auth = sessionStorage.getItem('admin_auth')
      const r = await fetch('/api/panel-turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': auth },
        body: JSON.stringify({ peluqueria_id: panelSel, clave: panelClave }),
      })
      const d = await r.json()
      if (!r.ok) { setPanelMsg({ tipo: 'error', texto: d.error || 'No se pudo guardar.' }); return }
      setPanelMsg({ tipo: 'ok', texto: 'Clave guardada. Pasásela al peluquero junto con el link.' })
      cargarPanelTurnos()
    } catch {
      setPanelMsg({ tipo: 'error', texto: 'No se pudo conectar.' })
    } finally {
      setPanelLoading(false)
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
      setMsgFn({ tipo: res.ok ? 'ok' : 'error', texto: res.ok ? `Email enviado a ${licencias[0]?.contacto}` : 'Error al enviar el email' })
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
          esNuevoCliente: false, esRenovacion: true, solicitudId,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setMsg({ tipo: 'error', texto: data.error })
      setLicRenovada({ licBase64: data.licBase64, nombreArchivo: data.nombreArchivo, vence: form.hasta })
      setMsg({ tipo: 'ok', texto: 'Licencia renovada correctamente' })
      setSolicitudId(null)
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
          esNuevoCliente: false, esRenovacion: false, solicitudId,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setMsgNueva({ tipo: 'error', texto: data.error })
      setLicNueva({ licBase64: data.licBase64, nombreArchivo: data.nombreArchivo, vence: formNueva.hasta })
      setMsgNueva({ tipo: 'ok', texto: 'Máquina agregada correctamente' })
      setSolicitudId(null)
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
      setMsgEditar({ tipo: 'ok', texto: 'Datos actualizados' })
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
      setMsgPago({ tipo: 'ok', texto: 'Cobro registrado' })
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
    <Shell>
      {/* ── Modal: editar cliente ── */}
      {modalEditar && (
        <Modal onClose={() => { setModalEditar(false); setMsgEditar(null) }}>
          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2"><Pencil size={18} /> Editar cliente</h3>
            <form onSubmit={guardarEdicion} className="space-y-4">
              <Field label="Nombre de la peluquería *">
                <Input required value={formEditar.nombre} onChange={e => setFormEditar(f => ({ ...f, nombre: e.target.value }))} />
              </Field>
              <Field label="Nombre de la persona">
                <Input value={formEditar.nombre_contacto} placeholder="Ej: Joaquín Jofre"
                  onChange={e => setFormEditar(f => ({ ...f, nombre_contacto: e.target.value }))} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Email">
                  <Input type="email" value={formEditar.contacto} placeholder="email@ejemplo.com"
                    onChange={e => setFormEditar(f => ({ ...f, contacto: e.target.value }))} />
                </Field>
                <Field label="Teléfono / WhatsApp">
                  <Input type="tel" value={formEditar.telefono} placeholder="+54 9 11..."
                    onChange={e => setFormEditar(f => ({ ...f, telefono: e.target.value }))} />
                </Field>
              </div>
              {msgEditar && <Alert tone={msgEditar.tipo}>{msgEditar.texto}</Alert>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => { setModalEditar(false); setMsgEditar(null) }}>Cancelar</Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={loadingEditar}>
                  {loadingEditar ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── Modal: registrar cobro ── */}
      {modalPago && (
        <Modal onClose={() => { setModalPago(false); setMsgPago(null) }}>
          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Wallet size={18} /> Registrar cobro</h3>
            <p className="text-zinc-500 text-sm mb-5">Anotá cuándo y cuánto te pagó <strong className="text-white">{nombre}</strong></p>
            <form onSubmit={registrarPago} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Monto ($) *">
                  <Input required type="number" min="1" step="0.01" value={formPago.monto} placeholder="Ej: 15000"
                    onChange={e => setFormPago(f => ({ ...f, monto: e.target.value }))} />
                </Field>
                <Field label="Fecha de pago *">
                  <Input required type="date" value={formPago.pagado_en}
                    onChange={e => setFormPago(f => ({ ...f, pagado_en: e.target.value }))} />
                </Field>
              </div>
              <Field label="Método">
                <Select value={formPago.metodo} onChange={e => setFormPago(f => ({ ...f, metodo: e.target.value }))}>
                  <option>Transferencia</option>
                  <option>Efectivo</option>
                  <option>MercadoPago</option>
                  <option>Otro</option>
                </Select>
              </Field>
              <Field label="Nota (opcional)">
                <Input value={formPago.nota} placeholder="Ej: pago del mes de marzo, renovación..."
                  onChange={e => setFormPago(f => ({ ...f, nota: e.target.value }))} />
              </Field>
              {msgPago && <Alert tone={msgPago.tipo}>{msgPago.texto}</Alert>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => { setModalPago(false); setMsgPago(null) }}>Cancelar</Button>
                <Button type="submit" variant="ghost" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white" disabled={loadingPago}>
                  {loadingPago ? 'Guardando…' : <><Check size={15} /> Registrar cobro</>}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── Modal: confirmar eliminar cliente ── */}
      {confirmEliminarCliente && (
        <Modal onClose={() => setConfirmEliminarCliente(false)}>
          <div className="p-6">
            <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2"><TriangleAlert size={18} /> Eliminar cliente</h3>
            <p className="text-zinc-400 text-sm mb-5">
              Vas a eliminar <strong className="text-white">{nombre}</strong> y todas sus licencias y cobros. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmEliminarCliente(false)}>Cancelar</Button>
              <Button variant="danger" className="flex-1" disabled={loadingEliminarCliente} onClick={eliminarCliente}>
                {loadingEliminarCliente ? 'Eliminando…' : 'Sí, eliminar'}
              </Button>
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
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmEliminarLic(null)}>Cancelar</Button>
              <Button variant="danger" className="flex-1" disabled={loadingEliminarLic} onClick={() => eliminarLicencia(confirmEliminarLic)}>
                {loadingEliminarLic ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: agregar máquina ── */}
      {modalNuevaMaq && (
        <Modal onClose={() => { setModalNuevaMaq(false); setMsgNueva(null); setLicNueva(null); setFormNueva(FORM_INICIAL); setSolicitudId(null) }}>
          <div className="p-6">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Plus size={18} /> Agregar máquina</h3>
              {solicitudId && (
                <Badge tone="violet" className="mt-1.5"><Inbox size={12} /> Desde solicitud de activación remota</Badge>
              )}
            </div>
            <form onSubmit={agregarMaquina} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Machine ID *">
                  <Input required value={formNueva.machineId} placeholder="ID único"
                    onChange={e => setFormNueva(f => ({ ...f, machineId: e.target.value }))} />
                </Field>
                <Field label="Nombre máquina">
                  <Input value={formNueva.nombreMaquina} placeholder="Ej: PC Caja"
                    onChange={e => setFormNueva(f => ({ ...f, nombreMaquina: e.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Desde *">
                  <Input required type="date" value={formNueva.desde} onChange={e => setFormNueva(f => ({ ...f, desde: e.target.value }))} />
                </Field>
                <Field label="Hasta *">
                  <Input required type="date" value={formNueva.hasta} onChange={e => setFormNueva(f => ({ ...f, hasta: e.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio ($)">
                  <Input type="number" min="0" value={formNueva.precio} placeholder="Opcional"
                    onChange={e => setFormNueva(f => ({ ...f, precio: e.target.value }))} />
                </Field>
                <Field label="Notas">
                  <Input value={formNueva.notas} placeholder="Opcional" onChange={e => setFormNueva(f => ({ ...f, notas: e.target.value }))} />
                </Field>
              </div>
              {msgNueva && <Alert tone={msgNueva.tipo}>{msgNueva.texto}</Alert>}
              {licNueva ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => descargarGenerada(licNueva)}>
                    <Download size={15} /> Descargar .lic
                  </Button>
                  <Button type="button" variant="primary" className="flex-1" disabled={!licencias[0]?.contacto}
                    onClick={() => enviarEmailLic(licNueva, setLoadingNueva, setMsgNueva)}>
                    <Mail size={15} /> Enviar email
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => { setModalNuevaMaq(false); setFormNueva(FORM_INICIAL); setSolicitudId(null) }}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1" disabled={loadingNueva}>
                    {loadingNueva ? 'Generando…' : 'Generar licencia'}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </Modal>
      )}

      {/* ── Header ── */}
      <TopBar>
        <BackLink icon={ArrowLeft} label="Dashboard" onClick={() => router.push('/dashboard')} />
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-300 font-medium truncate">{nombre}</span>
      </TopBar>

      <Main>
        {errorCarga ? (
          <Alert tone="error">{errorCarga}</Alert>
        ) : cargando ? (
          <div className="text-zinc-600 text-sm">Cargando…</div>
        ) : (
          <>
            {/* ── Card cliente + stats ── */}
            <Card className="mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-white truncate">{nombre}</h1>
                  <div className="flex flex-col gap-1 mt-1">
                    {licencias[0]?.nombre_contacto && (
                      <p className="text-zinc-300 text-sm font-medium flex items-center gap-1.5"><User size={13} /> {licencias[0].nombre_contacto}</p>
                    )}
                    {licencias[0]?.contacto && (
                      <p className="text-zinc-500 text-sm flex items-center gap-1.5"><AtSign size={13} /> {licencias[0].contacto}</p>
                    )}
                    {licencias[0]?.telefono && (
                      <p className="text-zinc-500 text-sm flex items-center gap-1.5"><Phone size={13} /> {licencias[0].telefono}</p>
                    )}
                    {!licencias[0]?.contacto && !licencias[0]?.telefono && (
                      <p className="text-zinc-600 text-sm italic">Sin datos de contacto</p>
                    )}
                  </div>
                  {miembroDesde && <p className="text-zinc-600 text-xs mt-1.5">Cliente desde {miembroDesde}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setModalEditar(true)}><Pencil size={13} /> Editar</Button>
                  <Button variant="outline" size="sm" className="!text-red-400 !border-red-900/50 hover:!border-red-700/50 hover:!text-red-300"
                    onClick={() => setConfirmEliminarCliente(true)}>
                    <Trash2 size={13} /> Eliminar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-zinc-800">
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
            </Card>

            {/* ── Sección: Cobros ── */}
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-white flex items-center gap-2"><Wallet size={16} /> Cobros</h2>
                  <p className="text-zinc-600 text-xs mt-0.5">Registrá los pagos reales, independientemente de la licencia</p>
                </div>
                <Button variant="ghost" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => setModalPago(true)}>
                  <Plus size={14} /> Registrar cobro
                </Button>
              </div>

              {pagos.length === 0 ? (
                <div className="text-center py-8 text-zinc-600">
                  <Coins size={28} className="mx-auto mb-2 text-zinc-700" />
                  <p className="text-sm">Todavía no hay cobros registrados para este cliente.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pagos.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-zinc-800/60 rounded-xl px-4 py-3 group gap-2">
                      <div className="min-w-0">
                        <div className="text-white text-sm font-medium">{p.pagado_en}</div>
                        <div className="text-zinc-500 text-xs mt-0.5 truncate">
                          {p.metodo}{p.nota ? ` · ${p.nota}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-emerald-400 font-bold">{formatPrecio(p.monto)}</span>
                        <button onClick={() => eliminarPago(p.id)}
                          className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 sm:opacity-0 transition-all">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ── Form renovar ── */}
            {mostrarForm && (
              <form onSubmit={renovar} className="bg-zinc-900 border border-violet-500/20 rounded-2xl p-5 sm:p-6 mb-6 fade-in">
                <div className="flex items-center justify-between mb-5 gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-violet-400 flex items-center gap-2"><RotateCw size={15} /> Renovar licencia</h3>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                      {nombreMaqSel ? `Máquina: ${nombreMaqSel}` : `Machine ID: ${machineIdSel}`}
                    </p>
                    {solicitudId && (
                      <Badge tone="violet" className="mt-1.5"><Inbox size={11} /> Desde solicitud de activación remota</Badge>
                    )}
                  </div>
                  <button type="button" onClick={() => { setMostrarForm(false); setMsg(null); setLicRenovada(null); setSolicitudId(null) }}
                    className="text-zinc-600 hover:text-white shrink-0"><X size={16} /></button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="Desde *">
                    <Input required type="date" value={form.desde} onChange={e => setForm(f => ({ ...f, desde: e.target.value }))} />
                  </Field>
                  <Field label="Hasta *">
                    <Input required type="date" value={form.hasta} onChange={e => setForm(f => ({ ...f, hasta: e.target.value }))} />
                  </Field>
                  <Field label="Precio ($)">
                    <Input type="number" min="0" value={form.precio} placeholder="Opcional" onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                  </Field>
                  <Field label="Notas">
                    <Input value={form.notas} placeholder="Opcional" onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
                  </Field>
                </div>
                {msg && <Alert tone={msg.tipo} className="mb-4">{msg.texto}</Alert>}
                {licRenovada ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => descargarGenerada(licRenovada)}>
                      <Download size={15} /> Descargar .lic
                    </Button>
                    <Button type="button" variant="primary" className="flex-1" disabled={!licencias[0]?.contacto}
                      onClick={() => enviarEmailLic(licRenovada, setLoading, setMsg)}>
                      <Mail size={15} /> Enviar email
                    </Button>
                  </div>
                ) : (
                  <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? 'Renovando…' : 'Renovar licencia'}
                  </Button>
                )}
              </form>
            )}

            {/* ── Panel de turnos ── */}
            <Card className="mb-6">
              <h2 className="font-semibold text-white mb-1 flex items-center gap-2"><Smartphone size={16} /> Panel de turnos</h2>
              <p className="text-zinc-500 text-xs mb-4">
                Clave para que el peluquero responda los turnos desde el celular.
              </p>

              {panelPeluquerias.length === 0 ? (
                <p className="text-zinc-500 text-sm">
                  Esta peluquería todavía no está registrada en el sistema de reservas online.
                </p>
              ) : (
                <form onSubmit={guardarClavePanel} className="flex flex-col gap-3">
                  {panelPeluquerias.length > 1 && (
                    <Field label="Hay varias con nombre parecido — elegí cuál:">
                      <Select value={panelSel} onChange={e => setPanelSel(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {panelPeluquerias.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} — {p.email}</option>
                        ))}
                      </Select>
                    </Field>
                  )}

                  {(() => {
                    const sel = panelPeluquerias.find(p => p.id === panelSel)
                    if (!sel) return null
                    return (
                      <>
                        <div className="flex items-center gap-2 text-xs">
                          {sel.tieneClave ? (
                            <span className="text-emerald-400">
                              ✓ Ya tiene clave{sel.claveActualizada ? ` (${sel.claveActualizada.slice(0, 10)})` : ''}
                            </span>
                          ) : (
                            <span className="text-amber-400">Todavía no tiene clave</span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Input value={panelClave} placeholder="Clave para el peluquero"
                            onChange={e => { setPanelClave(e.target.value); setPanelMsg(null) }} />
                          <Button type="button" variant="ghost" onClick={generarClave} className="whitespace-nowrap">Generar</Button>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                          <p className="text-zinc-500 text-xs mb-1">Link para el peluquero:</p>
                          <div className="flex items-center gap-2">
                            <code className="text-violet-400 text-xs font-mono break-all">
                              https://servicio-turno-web-peluapp.xyz/admin?p={sel.id}
                            </code>
                            <button type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`https://servicio-turno-web-peluapp.xyz/admin?p=${sel.id}`)
                                setPanelCopiado(true); setTimeout(() => setPanelCopiado(false), 2000)
                              }}
                              className="text-zinc-600 hover:text-zinc-300 text-xs transition-colors whitespace-nowrap shrink-0">
                              {panelCopiado ? <Check size={13} /> : 'Copiar'}
                            </button>
                          </div>
                        </div>

                        {panelMsg && <p className={`text-xs ${panelMsg.tipo === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{panelMsg.texto}</p>}

                        <Button type="submit" variant="primary" disabled={panelLoading}>
                          {panelLoading ? 'Guardando...' : sel.tieneClave ? 'Reemplazar clave' : 'Guardar clave'}
                        </Button>
                      </>
                    )
                  })()}
                </form>
              )}
            </Card>

            {/* ── Máquinas ── */}
            <div className="flex items-center justify-between mb-4 gap-2">
              <h2 className="font-semibold text-white flex items-center gap-2"><MonitorSmartphone size={16} /> Máquinas</h2>
              <Button variant="ghost" size="sm" onClick={() => { setModalNuevaMaq(true); setFormNueva(FORM_INICIAL); setMsgNueva(null); setLicNueva(null) }}>
                <Plus size={13} /> Agregar máquina
              </Button>
            </div>

            {maquinas.map(maq => {
              const estado       = getEstado(maq.ultima.vence)
              const totalMaqPago = maq.licencias.reduce((s, l) => s + (l.precio || 0), 0)

              return (
                <Card key={maq.machineId} className="mb-4">
                  <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{maq.ultima.nombre_maquina || 'Máquina sin nombre'}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <code className="text-zinc-500 text-xs bg-zinc-800 px-2 py-0.5 rounded font-mono break-all">{maq.machineId}</code>
                        <button onClick={() => copiar(maq.machineId)} className="text-zinc-600 hover:text-zinc-300 text-xs transition-colors shrink-0">
                          {copiadoId === maq.machineId ? '✓ Copiado' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge tone={estado.tone}>{estado.label}</Badge>
                      <div className={`text-2xl font-bold mt-1 ${estado.tone === 'red' ? 'text-red-400' : estado.tone === 'yellow' ? 'text-yellow-400' : 'text-green-400'}`}>
                        {estado.dias < 0 ? `Venció hace ${Math.abs(estado.dias)}d` : `${estado.dias} días`}
                      </div>
                      <div className="text-zinc-600 text-xs">Vence: {maq.ultima.vence}</div>
                    </div>
                  </div>

                  {!mostrarForm && (
                    <button onClick={() => {
                      setMachineIdSel(maq.machineId)
                      setNombreMaqSel(maq.ultima.nombre_maquina || null)
                      setMostrarForm(true); setLicRenovada(null); setMsg(null)
                      setForm(FORM_INICIAL)
                      setSolicitudId(null)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                      className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-400/30 hover:border-violet-400/60 px-3 py-1.5 rounded-lg transition-colors mb-5">
                      <RotateCw size={12} /> Renovar esta máquina
                    </button>
                  )}

                  {/* Historial de emisiones */}
                  <div>
                    <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">
                      Historial · {maq.licencias.length} emisión{maq.licencias.length !== 1 ? 'es' : ''}
                      {totalMaqPago > 0 && <span className="text-violet-400 ml-2">· {formatPrecio(totalMaqPago)} precio total</span>}
                    </p>
                    <div className="space-y-1.5">
                      {maq.licencias.map((lic, j) => {
                        const est        = getEstado(lic.vence)
                        const emailState = emailHistorial[lic.id]
                        return (
                          <div key={lic.id} className="bg-zinc-800/50 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                            <Badge tone={j === 0 ? est.tone : 'zinc'}>{j === 0 ? est.label : 'Histórica'}</Badge>
                            <span className="text-zinc-400 text-xs">{lic.desde} → {lic.vence}</span>
                            {lic.precio > 0 && <span className="text-zinc-500 text-xs">{formatPrecio(lic.precio)}</span>}
                            {lic.notas && <span className="text-zinc-600 text-xs italic truncate max-w-[180px]">{lic.notas}</span>}

                            <div className="ml-auto flex items-center gap-3">
                              <button onClick={() => descargarLic(lic)} className="text-zinc-500 hover:text-white transition-colors" title="Descargar .lic">
                                <Download size={13} />
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
                                      setEmailHistorial(prev => ({ ...prev, [lic.id]: { msg: res.ok ? '✓' : '✕' } }))
                                    } catch {
                                      setEmailHistorial(prev => ({ ...prev, [lic.id]: { msg: '✕' } }))
                                    }
                                  }}
                                  className="text-zinc-500 hover:text-violet-400 text-xs transition-colors disabled:opacity-50" title="Enviar por email">
                                  {emailState?.loading ? '…' : emailState?.msg || <Mail size={13} />}
                                </button>
                              )}
                              <button onClick={() => setConfirmEliminarLic(lic.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </Card>
              )
            })}
          </>
        )}
      </Main>
    </Shell>
  )
}
