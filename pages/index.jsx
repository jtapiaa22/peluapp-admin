import { useState } from 'react'
import { useRouter } from 'next/router'

export default function Login() {
  const [pass, setPass]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function ingresar(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass }),
    })
    setLoading(false)
    if (res.ok) {
      sessionStorage.setItem('admin_auth', pass)
      router.push('/dashboard')
    } else {
      setError('Contraseña incorrecta')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #3b0764 0%, #09090b 60%)' }}>

      <div className="w-full max-w-sm fade-in">
        {/* Logo / ícono */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-4">
            <span className="text-3xl">✂️</span>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">PeluApp Admin</h1>
          <p className="text-zinc-500 text-sm mt-1">Panel de gestión de licencias</p>
        </div>

        {/* Card */}
        <form onSubmit={ingresar}
          className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-8 flex flex-col gap-4 shadow-2xl">

          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Contraseña de acceso</label>
            <input
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-lg shadow-violet-900/30">
            {loading ? 'Verificando...' : 'Ingresar →'}
          </button>
        </form>

        <p className="text-zinc-700 text-xs text-center mt-6">Acceso restringido — solo uso interno</p>
      </div>
    </div>
  )
}
