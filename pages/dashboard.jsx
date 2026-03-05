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


// ─── Página ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth')
    if (!auth) { router.push('/'); return }
    cargarHistorial(auth)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function cargarHistorial(auth) {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/licencias', {
        headers: { 'x-admin-auth': auth },
      })
      if (res.status === 401) { sessionStorage.clear(); router.push('/'); return }
      if (!res.ok) throw new Error('Error al cargar licencias')
      const data = await res.json()
      setHistorial(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  // FIX: agrupar siempre por nombre de peluquería, no por contacto
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
    licencias,
    // reduce con string ISO es válido para fechas YYYY-MM-DD
    ultima:   licencias.reduce((a, b) => (a.vence > b.vence ? a : b)),
    maquinas: [...new Set(licencias.map(l => l.machine_id))].length,
  }))

  // FIX: filtrar por mes Y año para no acumular meses iguales de años anteriores
  const ahora     = new Date()
  const mesActual = ahora.getMonth()
  const anioActual = ahora.getFullYear()

  const gananciasMes = historial
    .filter(lic => {
      const f = new Date(lic.creada_en)
      return f.getMonth() === mesActual && f.getFullYear() === anioActual
    })
    .reduce((acc, lic) => acc + (Number(lic.precio) || 0), 0)

  // FIX: gananciasTotales ahora se muestra
  const gananciasTotales = historial.reduce((acc, lic) => acc + (Number(lic.precio) || 0), 0)

  const stats = {
    total:          peluquerias.length,
    activas:        peluquerias.filter(p => getEstado(p.ultima.vence).label === 'Activa').length,
    porVencer:      peluquerias.filter(p => getEstado(p.ultima.vence).label === 'Por vencer').length,
    vencidas:       peluquerias.filter(p => getEstado(p.ultima.vence).label === 'Vencida').length,
    gananciasMes,
    gananciasTotales,
  }

  // FIX: las tarjetas de stats usan keys únicas y muestran gananciasTotales
  const statCards = [
    { label: 'Mes actual',       value: `$${stats.gananciasMes.toLocaleString('es-AR')}`,    color: 'text-emerald-400', icon: '💰' },
    { label: 'Total histórico',  value: `$${stats.gananciasTotales.toLocaleString('es-AR')}`, color: 'text-emerald-300', icon: '📈' },
    { label: 'Total clientes',   value: stats.total,      color: 'text-white',      icon: '🏪' },
    { label: 'Activas',          value: stats.activas,    color: 'text-green-400',  icon: '✅' },
    { label: 'Por vencer',       value: stats.porVencer,  color: 'text-yellow-400', icon: '⚠️' },
    { label: 'Vencidas',         value: stats.vencidas,   color: 'text-red-400',    icon: '❌' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">✂️</span>
            <span className="font-bold text-white">PeluApp</span>
            <span className="text-zinc-600 text-sm">/ Licencias</span>
          </div>
          <div className="flex items-center gap-3">
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

        {/* FIX: un solo grid de stats, con skeleton mientras carga */}
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

        {/* Grid clientes */}
        <h2 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Clientes</h2>

        {cargando ? (
          <div className="text-zinc-600 text-sm">Cargando…</div>
        ) : error ? (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
            <span>Error: {error}</span>
            <button onClick={() => cargarHistorial(sessionStorage.getItem('admin_auth'))}
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
              const estado = getEstado(p.ultima.vence)
              return (
                <div key={p.nombre}
                  onClick={() => router.push(`/peluqueria/${encodeURIComponent(p.nombre)}`)}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30">

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white text-base">{p.nombre}</h3>
                      <p className="text-zinc-500 text-xs mt-0.5">{p.contacto || 'Sin contacto'}</p>
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
                      {p.maquinas} máquina{p.maquinas !== 1 ? 's' : ''} · {p.licencias.length} licencia{p.licencias.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-violet-400 text-xs font-medium">Ver detalle →</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
