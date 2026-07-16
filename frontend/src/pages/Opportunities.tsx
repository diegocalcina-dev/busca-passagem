import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { getOpportunities, Opportunity } from '../api/client'
import OpportunityCard from '../components/OpportunityCard'

type FilterKey = 'all' | 'good' | 'great' | 'mistake_fare' | 'confirmed'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'mistake_fare', label: 'Tarifa com erro' },
  { key: 'great', label: 'Otimas' },
  { key: 'good', label: 'Boas' },
  { key: 'confirmed', label: 'Confirmadas ao vivo' },
]

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showDismissed, setShowDismissed] = useState(false)

  const fetchData = (dismissed: boolean) => {
    setLoading(true)
    getOpportunities({ dismissed })
      .then(setOpportunities)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData(showDismissed)
  }, [showDismissed])

  const handleDismiss = (id: number) => {
    setOpportunities(prev => prev.filter(o => o.id !== id))
  }

  const filtered = opportunities.filter(o => {
    if (filter === 'all') return true
    if (filter === 'confirmed') return o.confirmed_live
    return o.strength === filter
  })

  const counts = {
    all: opportunities.length,
    mistake_fare: opportunities.filter(o => o.strength === 'mistake_fare').length,
    great: opportunities.filter(o => o.strength === 'great').length,
    good: opportunities.filter(o => o.strength === 'good').length,
    confirmed: opportunities.filter(o => o.confirmed_live).length,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Oportunidades</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {opportunities.length} {showDismissed ? 'dispensadas' : 'ativas'}
          </p>
        </div>
        <button
          onClick={() => setShowDismissed(v => !v)}
          className="text-sm text-gray-500 hover:text-gray-300 border border-bg-border px-3 py-1.5 rounded-lg transition-colors"
        >
          {showDismissed ? 'Ver ativas' : 'Ver dispensadas'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filter === key
                ? 'bg-accent/20 border-accent text-accent-light'
                : 'border-bg-border text-gray-500 hover:text-white'
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  filter === key ? 'bg-accent text-white' : 'bg-bg-hover text-gray-400'
                }`}
              >
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-bg-border rounded-xl p-12 text-center">
          <Zap className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Nenhuma oportunidade encontrada</p>
          <p className="text-gray-600 text-sm mt-1">
            {filter !== 'all' ? 'Tente outro filtro.' : 'O sistema esta monitorando suas rotas.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(opp => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onDismiss={showDismissed ? undefined : handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  )
}
