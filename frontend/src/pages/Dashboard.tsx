import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Zap, AlertOctagon, TrendingDown, ArrowRight } from 'lucide-react'
import { getDashboardStats, getOpportunities, getTargets, DashboardStats, Opportunity, Target } from '../api/client'
import OpportunityCard from '../components/OpportunityCard'
import RouteCard from '../components/RouteCard'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  accent?: string
  sub?: string
}

function StatCard({ label, value, icon, accent = 'text-accent', sub }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={`${accent} opacity-80`}>{icon}</div>
      </div>
      <p className={`text-3xl font-extrabold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1.5 truncate max-w-[180px]">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getOpportunities({ dismissed: false }),
      getTargets(),
    ])
      .then(([s, o, t]) => {
        setStats(s)
        setOpportunities(o.filter(op => op.expiry_status !== 'expired'))
        setTargets(t)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDismiss = (id: number) => {
    setOpportunities(prev => prev.filter(o => o.id !== id))
    if (stats) setStats({ ...stats, active_opportunities: stats.active_opportunities - 1 })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Carregando dados...</p>
        </div>
      </div>
    )
  }

  const topOpps = opportunities.slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Visao geral do sistema de monitoramento</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Rotas monitoradas"
          value={stats?.total_targets ?? 0}
          icon={<MapPin className="w-5 h-5" />}
          accent="text-accent-light"
        />
        <StatCard
          label="Oportunidades ativas"
          value={stats?.active_opportunities ?? 0}
          icon={<Zap className="w-5 h-5" />}
          accent="text-green-400"
        />
        <StatCard
          label="Tarifas com erro hoje"
          value={stats?.mistake_fares_today ?? 0}
          icon={<AlertOctagon className="w-5 h-5" />}
          accent="text-red-400"
        />
        <StatCard
          label="Melhor achado"
          value={stats?.best_deal_pct ? `-${stats.best_deal_pct.toFixed(0)}%` : '-'}
          icon={<TrendingDown className="w-5 h-5" />}
          accent="text-orange-400"
          sub={stats?.best_deal ?? undefined}
        />
      </div>

      {/* Active alerts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Alertas Ativos</h2>
          {opportunities.length > 3 && (
            <Link
              to="/opportunities"
              className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-light transition-colors"
            >
              Ver todas ({opportunities.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {topOpps.length === 0 ? (
          <div className="bg-bg-card border border-bg-border rounded-xl p-8 text-center">
            <Zap className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma oportunidade ativa no momento.</p>
            <p className="text-gray-600 text-xs mt-1">O sistema monitora suas rotas continuamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {topOpps.map(opp => (
              <OpportunityCard key={opp.id} opportunity={opp} onDismiss={handleDismiss} />
            ))}
          </div>
        )}
      </section>

      {/* Monitored routes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Rotas Monitoradas</h2>
          <Link
            to="/watchlist"
            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-light transition-colors"
          >
            Gerenciar
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.slice(0, 6).map(target => (
            <RouteCard
              key={target.id}
              target={target}
              onUpdate={updated => setTargets(prev => prev.map(t => (t.id === updated.id ? updated : t)))}
              onDelete={id => setTargets(prev => prev.filter(t => t.id !== id))}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
