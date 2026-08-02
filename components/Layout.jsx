// Cascarón de página compartido: fondo, header sticky y contenedor — antes cada página
// repetía este markup a mano (y con detalles ligeramente distintos entre sí).

export function Shell({ children }) {
  return <div className="min-h-screen bg-zinc-950 text-white">{children}</div>
}

export function TopBar({ children, wide }) {
  return (
    <div className="border-b border-zinc-800/60 bg-zinc-900/60 backdrop-blur sticky top-0 z-10">
      <div className={`${wide ? 'max-w-6xl' : 'max-w-4xl'} mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2`}>
        {children}
      </div>
    </div>
  )
}

export function Main({ children, wide }) {
  return <main className={`${wide ? 'max-w-6xl' : 'max-w-4xl'} mx-auto px-4 sm:px-6 py-6 sm:py-8`}>{children}</main>
}

// Ícono + nombre de la app, con el color de acento correspondiente (violeta PeluApp / azul KioscoApp).
export function Brand({ icon: Icon, name, accent = 'violet' }) {
  const color = accent === 'blue' ? 'text-blue-400' : 'text-violet-400'
  return (
    <div className="flex items-center gap-2 font-bold text-white shrink-0">
      <Icon size={19} className={color} strokeWidth={2.25} />
      <span>{name}</span>
    </div>
  )
}

// Botón de vuelta ("← Dashboard") usado en las páginas de detalle / nueva licencia.
export function BackLink({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm shrink-0">
      <Icon size={16} />
      {label}
    </button>
  )
}

// Switcher de tabs usado en los dos dashboards (Clientes / Solicitudes / Finanzas).
export function TabSwitch({ tabs, value, onChange }) {
  return (
    <div className="flex bg-zinc-800 rounded-lg p-1 gap-1 text-sm order-last sm:order-none w-full sm:w-auto overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors font-medium whitespace-nowrap ${
            value === t.value ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <t.icon size={14} />
          <span className="hidden xs:inline sm:inline">{t.label}</span>
          {t.badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-violet-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
