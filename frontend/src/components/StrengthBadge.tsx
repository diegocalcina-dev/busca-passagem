interface StrengthBadgeProps {
  strength: 'good' | 'great' | 'mistake_fare'
  size?: 'sm' | 'md'
}

const LABELS: Record<string, string> = {
  mistake_fare: 'TARIFA COM ERRO',
  great: 'OTIMO',
  good: 'BOM',
}

const STYLES: Record<string, string> = {
  mistake_fare: 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-glow-red',
  great: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
  good: 'bg-green-500/20 text-green-400 border border-green-500/40',
}

export default function StrengthBadge({ strength, size = 'md' }: StrengthBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span className={`inline-flex items-center rounded-full font-bold tracking-widest ${sizeClass} ${STYLES[strength]}`}>
      {LABELS[strength]}
    </span>
  )
}
