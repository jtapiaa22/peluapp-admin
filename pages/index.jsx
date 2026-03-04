import { useState } from 'react'
import { useRouter } from 'next/router'

export default function Login() {
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function ingresar(e) {
    e.preventDefault()
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
    })
    if (res.ok) {
        sessionStorage.setItem('admin_auth', '1')
        router.push('/dashboard')
    } else {
        setError('Contraseña incorrecta')
    }
 }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <form onSubmit={ingresar} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-white text-2xl font-bold text-center">🔑 PeluApp Admin</h1>
        <p className="text-zinc-500 text-sm text-center">Panel de licencias</p>
        <input
          type="password"
          placeholder="Contraseña"
          value={pass}
          onChange={e => setPass(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
        />
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <button type="submit"
          className="bg-violet-600 hover:bg-violet-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
          Ingresar
        </button>
      </form>
    </div>
  )
}
