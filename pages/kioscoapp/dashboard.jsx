import { ShoppingBasket } from 'lucide-react'
import ClientesDashboard from '@/components/ClientesDashboard'

export default function KioscoDashboard() {
  return (
    <ClientesDashboard
      accent="blue"
      brandIcon={ShoppingBasket}
      brandName="KioscoApp"
      campo="kiosco"
      apiBase="/api/kioscoapp"
      rutaDetalle={nombre => `/kioscoapp/${encodeURIComponent(nombre)}`}
      rutaNuevaLicencia="/kioscoapp/nueva-licencia"
      switchApp={{ label: 'PeluApp', href: '/dashboard' }}
    />
  )
}
