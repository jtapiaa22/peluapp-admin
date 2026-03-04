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
  return              { label: 'Activa',      text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  dias }
}

export default function DetallePeluqueria() {
  const router = useRouter()
  const { nombre } = router.query

  const [licencias, setLicencias]   = useState([])
  const [cargando, setCargando]     = useState(true)
  const [copiado, setCopiado]       = useState(false)
  const [msg, setMsg]               = useState(null)
  const [loadingGen, setLoadingGen] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
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

  function copiarMachineId() {
    if (!licencias[0]) return
    navigator.clipboard.writeText(licencias[0].machine_id)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
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
        machineId:  licencias[0]?.machine_id,
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
    setForm({ desde: hoy, hasta: '', notas: '' })
    cargarLicencias()
  }

  const ultima  = licencias[0]
  const estado  = ultima ? getEstado(ultima.vence) : null
  const inp     = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-white transition-colors text-sm flex items-center gap-2">
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
            {/* Info principal */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">{nombre}</h1>
                  <p className="text-zinc-500 text-sm mt-1">{ultima?.contacto || 'Sin contacto registrado'}</p>
                </div>

                {estado && (
                  <div className={`text-center px-5 py-3 rounded-xl border ${estado.bg} ${estado.border}`}>
                    <div className={`text-3xl font-bold ${estado.text}`}>
                      {estado.dias < 0 ? Math.abs(estado.dias) : estado.dias}
                    </div>
                    <div className={`text-xs mt-0.5 ${estado.text}`}>
                      {estado.dias < 0 ? 'días vencida' : 'días restantes'}
                    </div>
                    <div className={`text-xs mt-1 font-medium ${estado.text}`}>{estado.label}</div>
                  </div>
                )}
              </div>

              {/* Machine ID */}
              {ultima && (
                <div className="mt-5 pt-5 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-2">Machine ID</p>
                  <div className="flex items-center gap-3 bg-zinc-800 rounded-xl px-4 py-3">
                    <code className="text-violet-400 text-xs flex-1 break-all">{ultima.machine_id}</code>
                    <button onClick={copiarMachineId}
                      className="text-zinc-400 hover:text-white transition-colors text-xs whitespace-nowrap border border-zinc-700 hover:border-zinc-500 px-2.5 py-1 rounded-lg">
                      {copiado ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botón renovar + form */}
            <div className="mb-6">
              {!mostrarForm ? (
                <button onClick={() => setMostrarForm(true)}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">
                  ↻ Generar renovación
                </button>
              ) : (
                <form onSubmit={renovar} className="bg-zinc-900 border border-violet-500/20 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-violet-400">Nueva licencia para {nombre}</h3>
                    <button type="button" onClick={() => setMostrarForm(false)}
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
                    <p className={`mt-3 text-sm ${msg.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                      {msg.texto}
                    </p>
                  )}
                  <button type="submit" disabled={loadingGen}
                    className="mt-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">
                    {loadingGen ? 'Generando...' : '⬇ Generar y descargar .lic'}
                  </button>
                </form>
              )}
            </div>

            {/* Historial de licencias */}
            <div>
              <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">
                Historial de licencias ({licencias.length})
              </h2>
              <div className="space-y-3">
                {licencias.map((lic, i) => {
                  const est = getEstado(lic.vence)
                  return (
                    <div key={lic.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        {i === 0 && (
                          <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">Actual</span>
                        )}
                        <div>
                          <p className="text-sm text-white font-medium">
                            {lic.desde} → {lic.vence}
                          </p>
                          {lic.notas && <p className="text-xs text-zinc-500 mt-0.5">{lic.notas}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${est.bg} ${est.border} ${est.text}`}>
                          {est.label}
                        </span>
                        <button onClick={() => redownload(lic)}
                          className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors">
                          ↓ .lic
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
