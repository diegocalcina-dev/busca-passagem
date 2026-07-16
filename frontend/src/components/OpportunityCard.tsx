import { ExternalLink, CheckCircle, Database, Clock, ShieldAlert } from 'lucide-react'
import { Opportunity, dismissOpportunity } from '../api/client'
import StrengthBadge from './StrengthBadge'
import { useState } from 'react'

interface Props {
  opportunity: Opportunity
  onDismiss?: (id: number) => void
}

const CABIN_LABELS: Record<string, string> = {
  economy: 'Economy',
  premium: 'Premium Economy',
  business: 'Business',
  first: 'Primeira Classe',
}

function fmtPrice(price: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

function fmtDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

export default function OpportunityCard({ opportunity: opp, onDismiss }: Props) {
  const [dismissing, setDismissing] = useState(false)

  const glow =
    opp.strength === 'mistake_fare'
      ? 'border-red-500/40 shadow-glow-red'
      : opp.strength === 'great'
      ? 'border-orange-500/30'
      : 'border-green-500/20'

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await dismissOpportunity(opp.id)
      onDismiss?.(opp.id)
    } catch {
      setDismissing(false)
    }
  }

  return (
    <div className={`bg-bg-card border rounded-xl p-5 flex flex-col gap-4 transition-all ${glow}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-white">
              {opp.origin} → {opp.destination}
            </span>
            <StrengthBadge strength={opp.strength} />
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {fmtDate(opp.departure_at)}
            {opp.return_at && <> → {fmtDate(opp.return_at)}</>}
            {' '}·{' '}
            {CABIN_LABELS[opp.cabin] || opp.cabin}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-extrabold text-white tracking-tight">
            {fmtPrice(opp.price, opp.currency)}
          </p>
          {opp.baseline_price && (
            <p className="text-xs text-gray-500 mt-0.5">
              baseline {fmtPrice(opp.baseline_price, opp.currency)}
            </p>
          )}
        </div>
      </div>

      {/* Discount bar */}
      <div className="bg-bg-base rounded-lg px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm text-gray-400">Abaixo do baseline</span>
        <span
          className={`text-lg font-bold ${
            opp.strength === 'mistake_fare'
              ? 'text-red-400'
              : opp.strength === 'great'
              ? 'text-orange-400'
              : 'text-green-400'
          }`}
        >
          -{opp.pct_below_baseline.toFixed(1)}%
        </span>
      </div>

      {/* Airline + meta */}
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <span className="text-gray-300 font-medium">{opp.airline}</span>
        <span className="text-bg-border">|</span>
        {opp.confirmed_live ? (
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle className="w-3.5 h-3.5" />
            Confirmado ao vivo
          </span>
        ) : (
          <span className="flex items-center gap-1 text-gray-500">
            <Database className="w-3.5 h-3.5" />
            Travelpayouts
          </span>
        )}
        <span className="text-bg-border">|</span>
        {opp.expiry_status === 'valid' ? (
          <span className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3.5 h-3.5 text-green-500" />
            Valido
          </span>
        ) : opp.expiry_status === 'expired' ? (
          <span className="flex items-center gap-1 text-gray-500 line-through">
            <ShieldAlert className="w-3.5 h-3.5" />
            Expirado
          </span>
        ) : (
          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            Status desconhecido
          </span>
        )}
      </div>

      {/* Detected at */}
      <p className="text-xs text-gray-600">
        Detectado em {new Date(opp.detected_at).toLocaleString('pt-BR')}
      </p>

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        <a
          href={opp.buy_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Ver oferta
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-bg-border hover:border-gray-500 transition-colors disabled:opacity-50"
        >
          {dismissing ? '...' : 'Dispensar'}
        </button>
      </div>
    </div>
  )
}
