import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

function diasRestantes(vence) {
  const hoy = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z')
  const fv  = new Date(vence + 'T00:00:00Z')
  return Math.round((fv - hoy) / (1000 * 60 * 60 * 24)) + 1
}

function getEstado(vence) {
  const dias = diasRestantes(vence)
  if (dias < 0)   return { label: 'Vencida',    text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dias }
  if (dias <= 15) return { label: 'Por vencer', text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dias }
  return            { label: 'Activa',      text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  dias }
}

export default function DetallePeluqueria() {
  const router = useRouter()
  const { nombre } = router.query

  const [licencias, setLicencias]               = useState([])
  const [cargando, setCargando]                 = useState(true)
  const [msg, setMsg]                           = useState(null)
  const [loadingGen, setLoadingGen]             = useState(false)
  const [mostrarForm, setMostrarForm]           = useState(false)
  const [machineIdSeleccionado, setMachineIdSel] = useState(null)
  const [copiadoId, setCopiadoId]               = useState(null)
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ desde: hoy, hasta: '', notas: '' })

  useEffect(() => {
    if (!sessionStorage.getItem('admin_auth')) { router.push('/'); return }
  }, [])

  useEffect(() => {
    if (!nombre) return
    cargarLicencias()
  }, [nombre])

  async function cargarLicencias() {
    setCargando(true)
    const { data } = await supabase
      .from('licencias_vendidas')
      .select('*')
      .eq('peluqueria', nombre)
      .order('creada_en', { ascending: false })
    setLicencias(data || [])
    setCargando(false)
  }

  function copiar(machineId) {
    navigator.clipboard.writeText(machineId)
    setCopiadoId(machineId)
    setTimeout(() => setCopiadoId(null), 2000)
  }

  function redownload(lic) {
    const blob = new Blob([lic.lic_base64], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `licencia-${lic.peluqueria.replace(/\s+/g, '-')}-${lic.vence}.lic`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function renovar(e) {
    e.preventDefault()
    setLoadingGen(true); setMsg(null)
    const res = await fetch('/api/generar-licencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peluqueria: nombre,
        contacto:   licencias[0]?.contacto || '',
        machineId:  machineIdSeleccionado,
        desde:      form.desde,
        hasta:      form.hasta,
        notas:      form.notas,
      }),
    })
    const data = await res.json()
    setLoadingGen(false)
    if (!res.ok) return setMsg({ tipo: 'error', texto: data.error })

    const blob = new Blob([data.licBase64], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = data.nombreArchivo; a.click()
    URL.revokeObjectURL(url)

    setMsg({ tipo: 'ok', texto: '✅ Licencia renovada y descargada' })
    setMostrarForm(false)
    setMachineIdSel(null)
    setForm({ desde: hoy, hasta: '', notas: '' })
    cargarLicencias()
  }

  // Agrupar licencias por machine_id
  const maquinas = Object.entries(
    licencias.reduce((acc, lic) => {
      if (!acc[lic.machine_id]) acc[lic.machine_id] = []
      acc[lic.machine_id].push(lic)
      return acc
    }, {})
  ).map(([machineId, lics]) => ({
    machineId,
    licencias: lics,
    ultima: lics[0],
  }))

  const inp = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-white transition-colors text-sm">
            ← Volver
          </button>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-300 font-medium">{nombre}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 fade-in">
        {cargando ? (
          <div className="text-zinc-600 text-sm">Cargando...</div>
        ) : (
          <>
            {/* Info cliente */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <h1 className="text-2xl font-bold text-white">{nombre}</h1>
              <p className="text-zinc-500 text-sm mt-1">{licencias[0]?.contacto || 'Sin contacto registrado'}</p>
              <div className="mt-3 text-zinc-600 text-xs">
                {maquinas.length} máquina{maquinas.length !== 1 ? 's' : ''} registrada{maquinas.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Form renovación */}
            {mostrarForm && (
              <form onSubmit={renovar} className="bg-zinc-900 border border-violet-500/20 rounded-2xl p-6 mb-6 fade-in">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-semibold text-violet-400">Renovar licencia</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Máquina: <code className="text-violet-400">{machineIdSeleccionado?.substring(0, 20)}…</code>
                    </p>
                  </div>
                  <button type="button" onClick={() => { setMostrarForm(false); setMachineIdSel(null) }}
                    className="text-zinc-600 hover:text-white text-sm transition-colors">✕ Cancelar</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Desde *</label>
                    <input type="date" className={inp} required value={form.desde}
                      onChange={e => setForm(f => ({ ...f, desde: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Vence *</label>
                    <input type="date" className={inp} required value={form.hasta}
                      onChange={e => setForm(f => ({ ...f, hasta: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-zinc-400 mb-1.5 block">Notas internas</label>
                    <input className={inp} value={form.notas} placeholder="Ej: renovación 3 meses, pagó $X"
                      onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
                  </div>
                </div>
                {msg && (
                  <p className={`mt-3 text-sm ${msg.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msg.texto}</p>
                )}
                <button type="submit" disabled={loadingGen}
                  className="mt-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">
                  {loadingGen ? 'Generando...' : '⬇ Generar y descargar .lic'}
                </button>
              </form>
            )}

            {/* Máquinas */}
            <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">
              Máquinas registradas
            </h2>

            <div className="space-y-4">
              {maquinas.map((maq, i) => {
                const estado = getEstado(maq.ultima.vence)
                return (
                  <div key={maq.machineId} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">

                    {/* Header máquina */}
                    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                      <div>
                        <p className="text-xs text-zinc-500 mb-2">Máquina {i + 1}</p>
                        <div className="flex items-center gap-2">
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
                        <div className={`text-xl font-bold mt-1 ${estado.text}`}>
                          {estado.dias < 0 ? `Venció hace ${Math.abs(estado.dias)}d` : `${estado.dias} días`}
                        </div>
                        <div className="text-zinc-600 text-xs">Vence: {maq.ultima.vence}</div>
                      </div>
                    </div>

                    {/* Botón renovar */}
                    {!mostrarForm && (
                      <button onClick={() => {
                        setMachineIdSel(maq.machineId)
                        setMostrarForm(true)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                        className="text-xs text-violet-400 hover:text-violet-300 border border-violet-400/30 hover:border-violet-400/60 px-3 py-1.5 rounded-lg transition-colors mb-4">
                        ↻ Renovar esta máquina
                      </button>
                    )}

                    {/* Historial de esta máquina */}
                    <div className="space-y-2 mt-2">
                      {maq.licencias.map((lic, j) => {
                        const est = getEstado(lic.vence)
                        return (
                          <div key={lic.id}
                            className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-2.5 gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                              {j === 0 && (
                                <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">Actual</span>
                              )}
                              <span className="text-sm text-zinc-300">{lic.desde} → {lic.vence}</span>
                              {lic.notas && <span className="text-xs text-zinc-600">{lic.notas}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${est.bg} ${est.border} ${est.text}`}>
                                {est.label}
                              </span>
                              <button onClick={() => redownload(lic)}
                                className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2.5 py-1.5 rounded-lg transition-colors">
                                ↓ .lic
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
