export function fechaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function diasRestantes(vence) {
  const hoy = new Date(fechaHoy() + 'T00:00:00')
  const fv  = new Date(vence     + 'T00:00:00')
  return Math.round((fv - hoy) / (1000 * 60 * 60 * 24)) + 1
}

export function getEstado(vence) {
  const dias = diasRestantes(vence)
  if (dias < 0)   return { label: 'Vencida',    tone: 'red',    dot: 'bg-red-400',              dias }
  if (dias <= 15) return { label: 'Por vencer', tone: 'yellow', dot: 'bg-yellow-400 pulse-soft', dias }
  return            { label: 'Activa',      tone: 'green',  dot: 'bg-green-400',            dias }
}

export function formatPrecio(n) {
  return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })
}
