import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [form, setForm] = useState({ peluqueria: '', contacto: '', machineId: '', desde: '', hasta: '', notas: '' })
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!sessionStorage.getItem('admin_auth')) { router.push('/'); return }
    setForm(f => ({ ...f, desde: hoy }))
    cargarHistorial()
  }, [])

  async function cargarHistorial() {
    const { data } = await supabase
      .from('licencias_vendidas')
      .select('*')
      .order('creada_en', { ascending: false })
    setHistorial(data || [])
  }

  async function generar(e) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const res = await fetch('/api/generar-licencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setMsg({ tipo: 'error', texto: data.error })

    // Descarga automática del .lic
    const blob = new Blob([data.licBase64], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = data.nombreArchivo; a.click()
    URL.revokeObjectURL(url)

    setMsg({ tipo: 'ok', texto: '✅ Licencia generada y descargada' })
    setForm({ peluqueria: '', contacto: '', machineId: '', desde: hoy, hasta: '', notas: '' })
    cargarHistorial()
  }

  function redownload(lic) {
    const blob = new Blob([lic.lic_base64], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `licencia-${lic.peluqueria.replace(/\s+/g, '-')}-${lic.vence}.lic`
    a.click()
    URL.revokeObjectURL(url)
  }

  function renovar(lic) {
    setForm({
      peluqueria: lic.peluqueria,
      contacto: lic.contacto || '',
      machineId: lic.machine_id,
      desde: hoy,
      hasta: '',
      notas: `Renovación de licencia vencida el ${lic.vence}`
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const inp = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 max-w-5xl">
        <h1 className="text-2xl font-bold">🔑 Licencias PeluApp</h1>
        <button onClick={() => { sessionStorage.clear(); router.push('/') }}
          className="text-sm text-zinc-500 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
          Salir
        </button>
      </div>

      {/* Formulario nueva licencia */}
      <form onSubmit={generar} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10 max-w-2xl">
        <h2 className="text-base font-semibold mb-5 text-violet-400">Nueva licencia</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-zinc-400 mb-1 block">Nombre peluquería *</label>
            <input className={inp} required value={form.peluqueria}
              onChange={e => setForm(f => ({ ...f, peluqueria: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Contacto / email</label>
            <input className={inp} value={form.contacto}
              onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Machine ID *</label>
            <input className={inp} required value={form.machineId}
              onChange={e => setForm(f => ({ ...f, machineId: e.target.value }))}
              placeholder="ID que te mandó el cliente" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Desde *</label>
            <input type="date" className={inp} required value={form.desde}
              onChange={e => setForm(f => ({ ...f, desde: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Vence *</label>
            <input type="date" className={inp} required value={form.hasta}
              onChange={e => setForm(f => ({ ...f, hasta: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-zinc-400 mb-1 block">Notas internas</label>
            <input className={inp} value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Ej: pagó $X, 3 meses" />
          </div>
        </div>

        {msg && (
          <p className={`mt-3 text-sm ${msg.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {msg.texto}
          </p>
        )}

        <button type="submit" disabled={loading}
          className="mt-5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors">
          {loading ? 'Generando...' : '⬇ Generar y descargar .lic'}
        </button>
      </form>

      {/* Historial */}
      <div className="max-w-5xl">
        <h2 className="text-base font-semibold mb-4 text-zinc-300">
          Historial <span className="text-zinc-600 font-normal">({historial.length})</span>
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr className="text-zinc-500 text-left">
                <th className="px-4 py-3">Peluquería</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Machine ID</th>
                <th className="px-4 py-3">Desde</th>
                <th className="px-4 py-3">Vence</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {historial.map(lic => {
                const vencida = lic.vence < hoy
                return (
                  <tr key={lic.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-medium">{lic.peluqueria}</td>
                    <td className="px-4 py-3 text-zinc-400">{lic.contacto || '—'}</td>
                    <td className="px-4 py-3">
                      <code className="text-violet-400 text-xs bg-violet-400/10 px-2 py-0.5 rounded">
                        {lic.machine_id.substring(0, 14)}…
                      </code>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{lic.desde}</td>
                    <td className={`px-4 py-3 font-medium ${vencida ? 'text-red-400' : 'text-green-400'}`}>
                      {lic.vence} {vencida && '⚠️'}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs max-w-[160px] truncate">{lic.notas || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => redownload(lic)}
                          className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors">
                          ↓ .lic
                        </button>
                        <button onClick={() => renovar(lic)}
                          className="text-xs text-violet-400 hover:text-violet-300 border border-violet-400/30 hover:border-violet-400/60 px-2 py-1 rounded transition-colors">
                          ↻ Renovar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {historial.length === 0 && (
            <p className="text-zinc-600 text-sm p-6">Sin licencias generadas aún.</p>
          )}
        </div>
      </div>
    </div>
  )
}
