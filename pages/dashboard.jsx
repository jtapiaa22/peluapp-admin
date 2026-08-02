import { Scissors } from 'lucide-react'
import ClientesDashboard from '@/components/ClientesDashboard'

export default function Dashboard() {
  return (
    <ClientesDashboard
      accent="violet"
      brandIcon={Scissors}
      brandName="PeluApp"
      campo="peluqueria"
      apiBase="/api"
      rutaDetalle={nombre => `/peluqueria/${encodeURIComponent(nombre)}`}
      rutaNuevaLicencia="/nueva-licencia"
      switchApp={{ label: 'KioscoApp', href: '/kioscoapp/dashboard' }}
    />
  )
}
