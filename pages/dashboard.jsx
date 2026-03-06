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


// ─── Página ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()
  const [historial, setHistorial] = useState([])
  const [pagos,     setPagos]     = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [error,     setError]     = useState(null)
  const [tab,       setTab]       = useState('clientes') // 'clientes' | 'finanzas'

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth')
    if (!auth) { router.push('/'); return }
    cargarTodo(auth)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function cargarTodo(auth) {
    setCargando(true); setError(null)
    try {
      const [resLic, resPagos] = await Promise.all([
        fetch('/api/licencias', { headers: { 'x-admin-auth': auth } }),
        fetch('/api/pagos',     { headers: { 'x-admin-auth': auth } }),
      ])
      if (resLic.status === 401) { sessionStorage.clear(); router.push('/'); return }
      if (!resLic.ok) throw new Error('Error al cargar licencias')
      setHistorial(await resLic.json() || [])
      setPagos(resPagos.ok ? (await resPagos.json() || []) : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  // Agrupar por peluquería
  const peluquerias = Object.entries(
    historial.reduce((acc, lic) => {
      const clave = lic.peluqueria
      if (!acc[clave]) acc[clave] = []
      acc[clave].push(lic)
      return acc
    }, {})
  ).map(([nombre, licencias]) => ({
    nombre,
    contacto: licencias[0].contacto,
    telefono: licencias[0].telefono,
    licencias,
    ultima:   licencias.reduce((a, b) => (a.vence > b.vence ? a : b)),
    maquinas: [...new Set(licencias.map(l => l.machine_id))].length,
  }))

  // Stats financieras basadas en PAGOS reales
  const ahora      = new Date()
  const mesActual  = ahora.getMonth()
  const anioActual = ahora.getFullYear()

  const cobradoMes   = pagos
    .filter(p => { const f = new Date(p.pagado_en); return f.getMonth() === mesActual && f.getFullYear() === anioActual })
    .reduce((s, p) => s + Number(p.monto), 0)

  const cobradoTotal = pagos.reduce((s, p) => s + Number(p.monto), 0)

  // También mantener "precio licencias" como referencia
  const preciosTotales = historial.reduce((s, l) => s + (Number(l.precio) || 0), 0)

  const stats = {
    total:          peluquerias.length,
    activas:        peluquerias.filter(p => getEstado(p.ultima.vence).label === 'Activa').length,
    porVencer:      peluquerias.filter(p => getEstado(p.ultima.vence).label === 'Por vencer').length,
    vencidas:       peluquerias.filter(p => getEstado(p.ultima.vence).label === 'Vencida').length,
    cobradoMes,
    cobradoTotal,
    preciosTotales,
  }

  const statCards = [
    { label: 'Cobrado este mes', value: formatPrecio(stats.cobradoMes),    color: 'text-emerald-400', icon: '💰' },
    { label: 'Total cobrado',    value: formatPrecio(stats.cobradoTotal),   color: 'text-emerald-300', icon: '📈' },
    { label: 'Total clientes',   value: stats.total,      color: 'text-white',      icon: '🏪' },
    { label: 'Activas',          value: stats.activas,    color: 'text-green-400',  icon: '✅' },
    { label: 'Por vencer',       value: stats.porVencer,  color: 'text-yellow-400', icon: '⚠️' },
    { label: 'Vencidas',         value: stats.vencidas,   color: 'text-red-400',    icon: '❌' },
  ]

  // ── Finanzas: pagos por mes ──────────────────────────────────────────────
  const pagosPorMes = pagos.reduce((acc, p) => {
    const key = p.pagado_en.slice(0, 7) // YYYY-MM
    acc[key] = (acc[key] || 0) + Number(p.monto)
    return acc
  }, {})
  const mesesOrdenados = Object.entries(pagosPorMes).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12)
  const maxMes         = mesesOrdenados.length ? Math.max(...mesesOrdenados.map(m => m[1])) : 1

  // Últimos pagos para mostrar en finanzas
  const ultimosPagos = [...pagos].slice(0, 15)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">✂️</span>
            <span className="font-bold text-white">PeluApp</span>
            <span className="text-zinc-600 text-sm">/ {tab === 'clientes' ? 'Licencias' : 'Finanzas'}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex bg-zinc-800 rounded-lg p-1 gap-1 text-sm">
              <button onClick={() => setTab('clientes')}
                className={`px-3 py-1.5 rounded-md transition-colors font-medium ${
                  tab === 'clientes' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}>
                🏪 Clientes
              </button>
              <button onClick={() => setTab('finanzas')}
                className={`px-3 py-1.5 rounded-md transition-colors font-medium ${
                  tab === 'finanzas' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}>
                💰 Finanzas
              </button>
            </div>
            <button onClick={() => router.push('/nueva-licencia')}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              + Nueva licencia
            </button>
            <button onClick={() => { sessionStorage.clear(); router.push('/') }}
              className="text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 text-sm px-3 py-2 rounded-lg transition-colors">
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="text-2xl mb-1">{s.icon}</div>
              {cargando ? (
                <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse mb-1" />
              ) : (
                <div className={`text-2xl lg:text-3xl font-bold ${s.color}`}>{s.value}</div>
              )}
              <div className="text-zinc-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── TAB: CLIENTES ── */}
        {tab === 'clientes' && (
          <>
            <h2 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Clientes</h2>

            {cargando ? (
              <div className="text-zinc-600 text-sm">Cargando…</div>
            ) : error ? (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                <span>Error: {error}</span>
                <button onClick={() => cargarTodo(sessionStorage.getItem('admin_auth'))}
                  className="underline hover:no-underline text-sm ml-4">
                  Reintentar
                </button>
              </div>
            ) : peluquerias.length === 0 ? (
              <div className="text-center py-20 text-zinc-600">
                <div className="text-4xl mb-3">📋</div>
                <p>Todavía no hay licencias generadas.</p>
                <button onClick={() => router.push('/nueva-licencia')}
                  className="mt-4 text-violet-400 hover:text-violet-300 text-sm underline">
                  Generar la primera
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
                {peluquerias.map(p => {
                  const estado    = getEstado(p.ultima.vence)
                  const pagosCliente = pagos.filter(pg => pg.peluqueria === p.nombre)
                  const totalPagado  = pagosCliente.reduce((s, pg) => s + Number(pg.monto), 0)
                  return (
                    <div key={p.nombre}
                      onClick={() => router.push(`/peluqueria/${encodeURIComponent(p.nombre)}`)}
                      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30">

                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-white text-base">{p.nombre}</h3>
                          <p className="text-zinc-500 text-xs mt-0.5">{p.contacto || 'Sin email'}</p>
                          {p.telefono && (
                            <p className="text-zinc-600 text-xs mt-0.5">📞 {p.telefono}</p>
                          )}
                        </div>
                        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${estado.bg} ${estado.border} ${estado.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${estado.dot}`}></span>
                          {estado.label}
                        </span>
                      </div>

                      <div className={`text-2xl font-bold mb-1 ${estado.text}`}>
                        {estado.dias < 0 ? `Venció hace ${Math.abs(estado.dias)} días` : `${estado.dias} días`}
                      </div>
                      <div className="text-zinc-600 text-xs mb-4">Vence: {p.ultima.vence}</div>

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                        <span className="text-zinc-600 text-xs">
                          {p.maquinas} máquina{p.maquinas !== 1 ? 's' : ''} · {p.licencias.length} lic.
                        </span>
                        {totalPagado > 0
                          ? <span className="text-emerald-400 text-xs font-semibold">{formatPrecio(totalPagado)} cobrado</span>
                          : <span className="text-violet-400 text-xs font-medium">Ver detalle →</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB: FINANZAS ── */}
        {tab === 'finanzas' && (
          <div className="fade-in">
            <h2 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider">Historial de cobros</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Cobros por mes */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-5">📅 Cobros por mes</h3>
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
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Últimos cobros */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-5">🧾 Últimos cobros</h3>
                {ultimosPagos.length === 0 ? (
                  <p className="text-zinc-600 text-sm">Aún no hay cobros registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {ultimosPagos.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-3">
                        <div>
                          <div className="text-white text-sm font-medium">{p.peluqueria}</div>
                          <div className="text-zinc-500 text-xs mt-0.5">
                            {p.pagado_en} · {p.metodo}{p.nota ? ` · ${p.nota}` : ''}
                          </div>
                        </div>
                        <span className="text-emerald-400 font-bold text-sm">{formatPrecio(p.monto)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Resumen bottom */}
            {pagos.length > 0 && (
              <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-emerald-400">{formatPrecio(cobradoTotal)}</div>
                    <div className="text-zinc-500 text-sm mt-1">Total cobrado histórico</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-violet-400">{pagos.length}</div>
                    <div className="text-zinc-500 text-sm mt-1">Cobros registrados</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-zinc-300">
                      {formatPrecio(pagos.length ? cobradoTotal / pagos.length : 0)}
                    </div>
                    <div className="text-zinc-500 text-sm mt-1">Promedio por cobro</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
