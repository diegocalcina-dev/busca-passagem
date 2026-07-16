import { useEffect, useState } from 'react'
import { Zap, AlertTriangle } from 'lucide-react'
import { getOpportunities, Opportunity } from '../api/client'
import OpportunityCard from '../components/OpportunityCard'
import { Link } from 'react-router-dom'

type FilterKey = 'all' | 'good' | 'great' | 'mistake_fare' | 'confirmed'

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showDismissed, setShowDismissed] = useState(false)
  const [strategyA1, setStrategyA1] = useState(() =>
    localStorage.getItem('strategy_a1') !== 'false'
  )

  const fetchData = (dismissed: boolean) => {
    setLoading(true)
    getOpportunities({ dismissed })
      .then(setOpportunities)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData(showDismissed)
  }, [showDismissed])

  // Sincroniza com mudanças no localStorage (caso o usuário altere em Settings)
  useEffect(() => {
    const onStorage = () =>
      setStrategyA1(localStorage.getItem('strategy_a1') !== 'false')
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleDismiss = (id: number) => {
    setOpportunities(prev => prev.filter(o => o.id !== id))
  }

  // Aplica filtro de estratégia antes dos filtros de tab
  const visibleOpportunities = strategyA1
    ? opportunities
    : opportunities.filter(o => o.strength !== 'mistake_fare')

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Todas' },
    ...(strategyA1 ? [{ key: 'mistake_fare' as FilterKey, label: 'Tarifa com erro' }] : []),
    { key: 'great', label: 'Otimas' },
    { key: 'good', label: 'Boas' },
    { key: 'confirmed', label: 'Confirmadas ao vivo' },
  ]

  const filtered = visibleOpportunities.filter(o => {
    if (filter === 'mistake_fare' && !strategyA1) return false
    if (filter === 'all') return true
    if (filter === 'confirmed') return o.confirmed_live
    return o.strength === filter
  })

  const counts: Record<FilterKey, number> = {
    all: visibleOpportunities.length,
    mistake_fare: opportunities.filter(o => o.strength === 'mistake_fare').length,
    great: visibleOpportunities.filter(o => o.strength === 'great').length,
    good: visibleOpportunities.filter(o => o.strength === 'good').length,
    confirmed: visibleOpportunities.filter(o => o.confirmed_live).length,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Oportunidades</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {visibleOpportunities.length} {showDismissed ? 'dispensadas' : 'ativas'}
          </p>
        </div>
        <button
          onClick={() => setShowDismissed(v => !v)}
          className="text-sm text-gray-500 hover:text-gray-300 border border-bg-border px-3 py-1.5 rounded-lg transition-colors"
        >
          {showDismissed ? 'Ver ativas' : 'Ver dispensadas'}
        </button>
      </div>

      {/* Aviso quando A1 desligado */}
      {!strategyA1 && (
        <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Estratégia A1 desativada — tarifas com erro estão ocultas.{' '}
            <Link to="/settings" className="underline hover:text-yellow-300">
              Ativar em Configurações
            </Link>
          </span>
        </div>
      )}

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
