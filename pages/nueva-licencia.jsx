import { useState } from 'react'
import { useRouter } from 'next/router'

export default function NuevaLicencia() {
  const router = useRouter()
  const [form, setForm] = useState({ peluqueria: '', contacto: '', machineId: '', desde: new Date().toISOString().split('T')[0], hasta: '', notas: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const inp = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"

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

    const blob = new Blob([data.licBase64], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = data.nombreArchivo; a.click()
    URL.revokeObjectURL(url)

    setMsg({ tipo: 'ok', texto: '✅ Licencia generada y descargada' })
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-white transition-colors text-sm">← Volver</button>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-300 font-medium">Nueva licencia</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 fade-in">
        <form onSubmit={generar} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h2 className="text-lg font-bold mb-6">Datos del cliente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-zinc-400 mb-1.5 block">Nombre peluquería *</label>
              <input className={inp} required value={form.peluqueria}
                onChange={e => setForm(f => ({ ...f, peluqueria: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Contacto / email</label>
              <input className={inp} value={form.contacto}
                onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Machine ID *</label>
              <input className={inp} required value={form.machineId} placeholder="ID que te mandó el cliente"
                onChange={e => setForm(f => ({ ...f, machineId: e.target.value }))} />
            </div>
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
              <input className={inp} value={form.notas} placeholder="Ej: pagó $X por 3 meses"
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          {msg && (
            <p className={`mt-4 text-sm ${msg.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msg.texto}</p>
          )}
          <button type="submit" disabled={loading}
            className="mt-6 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
            {loading ? 'Generando...' : '⬇ Generar y descargar .lic'}
          </button>
        </form>
      </div>
    </div>
  )
}
