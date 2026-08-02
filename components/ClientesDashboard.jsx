import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  Store, Inbox, Wallet, Plus, LogOut, ArrowLeftRight, User, Mail, Phone,
  CircleCheck, TriangleAlert, CircleX, TrendingUp, ClipboardList, Calendar, Receipt,
} from 'lucide-react'
import { Shell, TopBar, Main, Brand, TabSwitch } from './Layout'
import { Badge, Card, StatCard, EmptyState, Button } from './ui'
import { getEstado, formatPrecio } from '@/lib/format'

const ESTADO_TEXT = { red: 'text-red-400', yellow: 'text-yellow-400', green: 'text-green-400' }

// Dashboard de clientes/licencias — un solo componente parametrizado por app, ya que
// pages/dashboard.jsx y pages/kioscoapp/dashboard.jsx eran, letra por letra, la misma
// página con otro nombre de campo y otro color de acento.
export default function ClientesDashboard({
  accent, brandIcon, brandName, campo, apiBase, rutaDetalle, rutaNuevaLicencia, switchApp,
}) {
  const router = useRouter()
  const [historial,   setHistorial]   = useState([])
  const [pagos,       setPagos]       = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [error,       setError]       = useState(null)
  const [tab,         setTab]         = useState('clientes')
  const accentText = accent === 'blue' ? 'text-blue-400' : 'text-violet-400'

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth')
    if (!auth) { router.push('/'); return }
    cargarTodo(auth)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function cargarTodo(auth) {
    setCargando(true); setError(null)
    try {
      const [resLic, resPagos, resSol] = await Promise.all([
        fetch(`${apiBase}/licencias`, { headers: { 'x-admin-auth': auth } }),
        fetch(`${apiBase}/pagos`,     { headers: { 'x-admin-auth': auth } }),
        fetch(`${apiBase}/solicitudes?estado=pendiente`, { headers: { 'x-admin-auth': auth } }),
      ])
      if (resLic.status === 401) { sessionStorage.clear(); router.push('/'); return }
      if (!resLic.ok) throw new Error('Error al cargar licencias')
      setHistorial(await resLic.json() || [])
      setPagos(resPagos.ok ? (await resPagos.json() || []) : [])
      setSolicitudes(resSol.ok ? (await resSol.json() || []) : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  async function rechazarSolicitud(id) {
    const auth = sessionStorage.getItem('admin_auth')
    await fetch(`${apiBase}/solicitudes?id=${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-auth': auth },
      body:    JSON.stringify({ estado: 'rechazada' }),
    })
    setSolicitudes(s => s.filter(x => x.id !== id))
  }

  // Decide a dónde mandar el "Activar" según si la solicitud es de un cliente nuevo, una
  // renovación (misma máquina ya tiene licencia) o una máquina nueva de un cliente que ya existe
  // (mismo email, otra máquina) — evita el error de "contacto duplicado" de nueva-licencia.jsx.
  function activarSolicitud(s) {
    const mismaMaquina = historial.find(l => l.machine_id === s.machine_id)
    if (mismaMaquina) {
      const params = new URLSearchParams({ solicitudId: s.id, machineId: s.machine_id })
      router.push(`${rutaDetalle(mismaMaquina[campo])}?${params.toString()}`)
      return
    }

    const mismoCliente = s.contacto && historial.find(l => l.contacto?.toLowerCase() === s.contacto.toLowerCase())
    if (mismoCliente) {
      const params = new URLSearchParams({
        solicitudId:    s.id,
        agregarMaquina: '1',
        machineId:      s.machine_id || '',
        nombreMaquina:  s.nombre_maquina || '',
      })
      router.push(`${rutaDetalle(mismoCliente[campo])}?${params.toString()}`)
      return
    }

    const params = new URLSearchParams({
      solicitudId:     s.id,
      [campo]:         s[campo] || '',
      nombre_contacto: s.nombre_contacto || '',
      contacto:        s.contacto || '',
      telefono:        s.telefono || '',
      machineId:       s.machine_id || '',
      nombreMaquina:   s.nombre_maquina || '',
    })
    router.push(`${rutaNuevaLicencia}?${params.toString()}`)
  }

  // Agrupar por cliente
  const clientes = Object.entries(
    historial.reduce((acc, lic) => {
      const clave = lic[campo]
      if (!acc[clave]) acc[clave] = []
      acc[clave].push(lic)
      return acc
    }, {})
  ).map(([nombre, licencias]) => ({
    nombre,
    nombre_contacto: licencias[0].nombre_contacto,
    contacto: licencias[0].contacto,
    telefono: licencias[0].telefono,
    licencias,
    ultima:   licencias.reduce((a, b) => (a.vence > b.vence ? a : b)),
    maquinas: [...new Set(licencias.map(l => l.machine_id))].length,
  }))

  const ahora      = new Date()
  const mesActual  = ahora.getMonth()
  const anioActual = ahora.getFullYear()

  const cobradoMes = pagos
    .filter(p => { const f = new Date(p.pagado_en); return f.getMonth() === mesActual && f.getFullYear() === anioActual })
    .reduce((s, p) => s + Number(p.monto), 0)
  const cobradoTotal = pagos.reduce((s, p) => s + Number(p.monto), 0)

  const stats = {
    total:     clientes.length,
    activas:   clientes.filter(p => getEstado(p.ultima.vence).label === 'Activa').length,
    porVencer: clientes.filter(p => getEstado(p.ultima.vence).label === 'Por vencer').length,
    vencidas:  clientes.filter(p => getEstado(p.ultima.vence).label === 'Vencida').length,
  }

  const statCards = [
    { label: 'Cobrado este mes', value: formatPrecio(cobradoMes),   color: 'text-emerald-400', icon: Wallet },
    { label: 'Total cobrado',    value: formatPrecio(cobradoTotal), color: 'text-emerald-300', icon: TrendingUp },
    { label: 'Total clientes',   value: stats.total,     color: 'text-white',      icon: Store },
    { label: 'Activas',         value: stats.activas,   color: 'text-green-400',  icon: CircleCheck },
    { label: 'Por vencer',      value: stats.porVencer, color: 'text-yellow-400', icon: TriangleAlert },
    { label: 'Vencidas',        value: stats.vencidas,  color: 'text-red-400',    icon: CircleX },
  ]

  const pagosPorMes = pagos.reduce((acc, p) => {
    const key = p.pagado_en.slice(0, 7)
    acc[key] = (acc[key] || 0) + Number(p.monto)
    return acc
  }, {})
  const mesesOrdenados = Object.entries(pagosPorMes).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12)
  const maxMes         = mesesOrdenados.length ? Math.max(...mesesOrdenados.map(m => m[1])) : 1
  const ultimosPagos   = [...pagos].slice(0, 15)

  const tabs = [
    { value: 'clientes',    label: 'Clientes',    icon: Store },
    { value: 'solicitudes', label: 'Solicitudes', icon: Inbox, badge: solicitudes.length },
    { value: 'finanzas',    label: 'Finanzas',    icon: Wallet },
  ]

  return (
    <Shell>
      <TopBar wide>
        <Brand icon={brandIcon} name={brandName} accent={accent} />

        <TabSwitch tabs={tabs} value={tab} onChange={setTab} />

        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <Button variant="primary" accent={accent} size="sm" onClick={() => router.push(rutaNuevaLicencia)}>
            <Plus size={14} /> <span className="hidden sm:inline">Nueva licencia</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(switchApp.href)} title={switchApp.label}>
            <ArrowLeftRight size={14} /> <span className="hidden md:inline">{switchApp.label}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => { sessionStorage.clear(); router.push('/') }} title="Salir">
            <LogOut size={14} />
          </Button>
        </div>
      </TopBar>

      <Main wide>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          {statCards.map(s => <StatCard key={s.label} {...s} loading={cargando} />)}
        </div>

        {tab === 'clientes' && (
          <>
            <h2 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Clientes</h2>

            {cargando ? (
              <div className="text-zinc-600 text-sm">Cargando…</div>
            ) : error ? (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2">
                <span>Error: {error}</span>
                <button onClick={() => cargarTodo(sessionStorage.getItem('admin_auth'))} className="underline hover:no-underline text-sm">
                  Reintentar
                </button>
              </div>
            ) : clientes.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Todavía no hay licencias generadas." action={
                <button onClick={() => router.push(rutaNuevaLicencia)} className="mt-4 text-violet-400 hover:text-violet-300 text-sm underline">
                  Generar la primera
                </button>
              } />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
                {clientes.map(p => {
                  const estado       = getEstado(p.ultima.vence)
                  const pagosCliente = pagos.filter(pg => pg[campo] === p.nombre)
                  const totalPagado  = pagosCliente.reduce((s, pg) => s + Number(pg.monto), 0)
                  return (
                    <Card key={p.nombre}
                      onClick={() => router.push(rutaDetalle(p.nombre))}
                      className="hover:border-zinc-600 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30"
                    >
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white text-base truncate">{p.nombre}</h3>
                          {p.nombre_contacto && (
                            <p className="text-zinc-400 text-xs mt-0.5 font-medium flex items-center gap-1"><User size={11} /> {p.nombre_contacto}</p>
                          )}
                          <p className="text-zinc-500 text-xs mt-0.5 truncate">{p.contacto || 'Sin email'}</p>
                          {p.telefono && <p className="text-zinc-600 text-xs mt-0.5 flex items-center gap-1"><Phone size={11} /> {p.telefono}</p>}
                        </div>
                        <Badge tone={estado.tone} dot={estado.dot}>{estado.label}</Badge>
                      </div>

                      <div className={`text-2xl font-bold mb-1 ${ESTADO_TEXT[estado.tone]}`}>
                        {estado.dias < 0 ? `Venció hace ${Math.abs(estado.dias)} días` : `${estado.dias} días`}
                      </div>
                      <div className="text-zinc-600 text-xs mb-4">Vence: {p.ultima.vence}</div>

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                        <span className="text-zinc-600 text-xs">
                          {p.maquinas} máquina{p.maquinas !== 1 ? 's' : ''} · {p.licencias.length} lic.
                        </span>
                        {totalPagado > 0
                          ? <span className="text-emerald-400 text-xs font-semibold">{formatPrecio(totalPagado)} cobrado</span>
                          : <span className={`${accentText} text-xs font-medium`}>Ver detalle →</span>
                        }
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}

        {tab === 'solicitudes' && (
          <div className="fade-in">
            <h2 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Solicitudes de activación remota</h2>

            {cargando ? (
              <div className="text-zinc-600 text-sm">Cargando…</div>
            ) : solicitudes.length === 0 ? (
              <EmptyState icon={Inbox} title="No hay solicitudes pendientes." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {solicitudes.map(s => (
                  <Card key={s.id}>
                    <h3 className="font-semibold text-white text-base truncate">{s[campo]}</h3>
                    {s.nombre_contacto && <p className="text-zinc-400 text-xs mt-0.5 font-medium flex items-center gap-1"><User size={11} /> {s.nombre_contacto}</p>}
                    <p className="text-zinc-500 text-xs mt-0.5 truncate">{s.contacto || 'Sin email'}</p>
                    {s.telefono && <p className="text-zinc-600 text-xs mt-0.5 flex items-center gap-1"><Phone size={11} /> {s.telefono}</p>}
                    <p className="text-zinc-600 text-xs mt-2 font-mono break-all">{s.machine_id}</p>
                    {s.nombre_maquina && <p className="text-zinc-600 text-xs mt-0.5">{s.nombre_maquina}</p>}
                    <p className="text-zinc-700 text-xs mt-2">{new Date(s.creada_en).toLocaleString('es-AR')}</p>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-800">
                      <Button variant="primary" accent={accent} size="sm" className="flex-1" onClick={() => activarSolicitud(s)}>Activar</Button>
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => rechazarSolicitud(s.id)}>Rechazar</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'finanzas' && (
          <div className="fade-in">
            <h2 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider">Historial de cobros</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="font-semibold text-white mb-5 flex items-center gap-2"><Calendar size={16} /> Cobros por mes</h3>
                {mesesOrdenados.length === 0 ? (
                  <p className="text-zinc-600 text-sm">Aún no hay cobros registrados.</p>
                ) : (
                  <div className="space-y-3">
                    {mesesOrdenados.map(([mes, total]) => {
                      const [anio, m] = mes.split('-')
                      const label = new Date(Number(anio), Number(m) - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                      const pct   = Math.round((total / maxMes) * 100)
                      return (
                        <div key={mes}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-zinc-400 capitalize">{label}</span>
                            <span className="text-emerald-400 font-semibold">{formatPrecio(total)}</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>

              <Card>
                <h3 className="font-semibold text-white mb-5 flex items-center gap-2"><Receipt size={16} /> Últimos cobros</h3>
                {ultimosPagos.length === 0 ? (
                  <p className="text-zinc-600 text-sm">Aún no hay cobros registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {ultimosPagos.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-3 gap-3">
                        <div className="min-w-0">
                          <div className="text-white text-sm font-medium truncate">{p[campo]}</div>
                          <div className="text-zinc-500 text-xs mt-0.5 truncate">
                            {p.pagado_en} · {p.metodo}{p.nota ? ` · ${p.nota}` : ''}
                          </div>
                        </div>
                        <span className="text-emerald-400 font-bold text-sm shrink-0">{formatPrecio(p.monto)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {pagos.length > 0 && (
              <Card className="mt-6">
                <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
                  <div>
                    <div className="text-xl sm:text-3xl font-bold text-emerald-400">{formatPrecio(cobradoTotal)}</div>
                    <div className="text-zinc-500 text-xs sm:text-sm mt-1">Total cobrado histórico</div>
                  </div>
                  <div>
                    <div className={`text-xl sm:text-3xl font-bold ${accentText}`}>{pagos.length}</div>
                    <div className="text-zinc-500 text-xs sm:text-sm mt-1">Cobros registrados</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-3xl font-bold text-zinc-300">
                      {formatPrecio(pagos.length ? cobradoTotal / pagos.length : 0)}
                    </div>
                    <div className="text-zinc-500 text-xs sm:text-sm mt-1">Promedio por cobro</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </Main>
    </Shell>
  )
}
