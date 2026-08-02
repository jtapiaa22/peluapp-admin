// Piezas de UI compartidas por todo el panel — mismo lenguaje visual (dark + acento de marca)
// para que cada página no reinvente su propio botón/card/badge.

const TONES = {
  zinc:    'bg-zinc-800 border-zinc-700 text-zinc-400',
  red:     'bg-red-500/10 border-red-500/20 text-red-400',
  yellow:  'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  green:   'bg-green-500/10 border-green-500/20 text-green-400',
  violet:  'bg-violet-500/10 border-violet-500/20 text-violet-400',
  blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
}

export function Badge({ children, tone = 'zinc', dot, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${TONES[tone]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
      {children}
    </span>
  )
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

const BUTTON_VARIANTS = {
  primary: 'text-white shadow-lg',
  outline: 'text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 bg-transparent',
  ghost:   'bg-zinc-800 hover:bg-zinc-700 text-zinc-300',
  danger:  'bg-red-600 hover:bg-red-500 text-white',
  link:    'bg-transparent text-zinc-500 hover:text-white',
}

const BUTTON_SIZES = {
  sm: 'text-xs px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2 rounded-lg',
  lg: 'text-sm px-4 py-3 rounded-xl font-semibold',
}

// `accent` colorea la variante "primary" con el acento de marca (violet en PeluApp, blue en KioscoApp).
export function Button({ variant = 'ghost', size = 'md', accent = 'violet', className = '', disabled, children, ...props }) {
  const primaryBg = accent === 'blue'
    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
    : 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/30'
  const base = variant === 'primary' ? `${primaryBg} ${BUTTON_VARIANTS.primary}` : BUTTON_VARIANTS[variant]
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${base} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children }) {
  return (
    <div>
      {label && <label className="text-xs text-zinc-400 mb-1.5 block">{label}</label>}
      {children}
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  )
}

const inputBase =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm ' +
  'focus:outline-none focus:ring-1 transition-colors placeholder:text-zinc-600'

export function Input({ accent = 'violet', className = '', ...props }) {
  const focus = accent === 'blue' ? 'focus:border-blue-500 focus:ring-blue-500/30' : 'focus:border-violet-500 focus:ring-violet-500/30'
  return <input className={`${inputBase} ${focus} ${className}`} {...props} />
}

export function Select({ accent = 'violet', className = '', children, ...props }) {
  const focus = accent === 'blue' ? 'focus:border-blue-500 focus:ring-blue-500/30' : 'focus:border-violet-500 focus:ring-violet-500/30'
  return (
    <select className={`${inputBase} ${focus} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Alert({ tone = 'zinc', children, className = '' }) {
  const tones = {
    ok:    'bg-green-500/10 border-green-500/20 text-green-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    zinc:  'bg-zinc-800/60 border-zinc-700 text-zinc-300',
  }
  return <div className={`text-sm px-3.5 py-2.5 rounded-xl border ${tones[tone]} ${className}`}>{children}</div>
}

export function StatCard({ icon: Icon, label, value, color = 'text-white', loading }) {
  return (
    <Card className="p-4 sm:p-5">
      {Icon && <Icon size={20} className={`mb-2 ${color}`} strokeWidth={2} />}
      {loading ? (
        <div className="h-7 sm:h-8 w-16 bg-zinc-800 rounded animate-pulse mb-1" />
      ) : (
        <div className={`text-xl sm:text-2xl lg:text-3xl font-bold truncate ${color}`}>{value}</div>
      )}
      <div className="text-zinc-500 text-xs sm:text-sm mt-1">{label}</div>
    </Card>
  )
}

export function EmptyState({ icon: Icon, title, action }) {
  return (
    <div className="text-center py-16 sm:py-20 text-zinc-600">
      {Icon && <Icon size={36} className="mx-auto mb-3 text-zinc-700" strokeWidth={1.5} />}
      <p>{title}</p>
      {action}
    </div>
  )
}

export function Modal({ onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-zinc-900 border border-zinc-800 sm:border-zinc-700 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto shadow-2xl rounded-t-2xl sm:rounded-2xl`}>
        {children}
      </div>
    </div>
  )
}
