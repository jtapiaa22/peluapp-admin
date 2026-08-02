import { useState } from 'react'
import { useRouter } from 'next/router'
import { KeyRound, ArrowRight } from 'lucide-react'
import { Alert, Button, Field, Input } from '@/components/ui'

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
            <KeyRound size={26} className="text-violet-300" strokeWidth={2} />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Panel de administración</h1>
          <p className="text-zinc-500 text-sm mt-1">PeluApp &amp; KioscoApp — gestión de licencias</p>
        </div>

        {/* Card */}
        <form onSubmit={ingresar}
          className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-8 flex flex-col gap-4 shadow-2xl">

          <Field label="Contraseña de acceso">
            <Input
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
              className="px-4 py-3 rounded-xl"
              autoFocus
            />
          </Field>

          {error && <Alert tone="error" className="text-center">{error}</Alert>}

          <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full rounded-xl">
            {loading ? 'Verificando...' : <>Ingresar <ArrowRight size={16} /></>}
          </Button>
        </form>

        <p className="text-zinc-700 text-xs text-center mt-6">Acceso restringido — solo uso interno</p>
      </div>
    </div>
  )
}
