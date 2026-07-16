import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, TrendingDown } from 'lucide-react'
import { getPriceHistory, getObservations, PriceHistoryPoint, Observation } from '../api/client'
import PriceChart from '../components/PriceChart'

const BASELINES: Record<string, { median: number; p10: number; min_price: number; p25: number }> = {
  'GRU-LIS-economy': { median: 3200, p25: 2600, p10: 2100, min_price: 1650 },
  'GRU-LIS-business': { median: 12500, p25: 9800, p10: 7200, min_price: 5800 },
  'GRU-MIA-economy': { median: 2800, p25: 2300, p10: 1900, min_price: 1450 },
  'GIG-CDG-economy': { median: 4100, p25: 3300, p10: 2800, min_price: 2200 },
  'GRU-NRT-economy': { median: 5600, p25: 4500, p10: 3800, min_price: 3100 },
  'CGH-SCL-economy': { median: 1200, p25: 980, p10: 780, min_price: 620 },
}

function fmtPrice(price: number) {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export default function RouteDetail() {
  const { origin, destination } = useParams<{ origin: string; destination: string }>()
  const [cabin, setCabin] = useState<'economy' | 'business'>('economy')
  const [history, setHistory] = useState<PriceHistoryPoint[]>([])
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)

  const routeKey = `${origin}-${destination}-${cabin}`
  const baseline = BASELINES[routeKey]

  useEffect(() => {
    if (!origin || !destination) return
    setLoading(true)
    Promise.all([
      getPriceHistory(origin, destination, cabin, 60),
      getObservations(),
    ])
      .then(([hist, obs]) => {
        setHistory(hist)
        setObservations(
          obs
            .filter(
              o =>
                o.origin === origin &&
                o.destination === destination &&
                o.cabin === cabin,
            )
            .slice(0, 20),
        )
      })
      .finally(() => setLoading(false))
  }, [origin, destination, cabin])

  if (!origin || !destination) {
    return <p className="text-gray-500">Rota invalida.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back + header */}
      <div>
        <Link
          to="/watchlist"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Watchlist
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {origin} → {destination}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Historico de precos • ultimos 60 dias</p>
          </div>

          {/* Cabin switcher */}
          <div className="flex gap-2">
            {(['economy', 'business'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCabin(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  cabin === c
                    ? 'bg-accent/20 border-accent text-accent-light'
                    : 'border-bg-border text-gray-500 hover:text-white'
                }`}
              >
                {c === 'economy' ? 'Economy' : 'Business'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Baseline stats */}
      {baseline && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Mediana (baseline)', value: baseline.median, color: 'text-accent-light' },
            { label: 'Percentil 25', value: baseline.p25, color: 'text-gray-300' },
            { label: 'Percentil 10 (oferta)', value: baseline.p10, color: 'text-green-400' },
            { label: 'Minimo historico', value: baseline.min_price, color: 'text-orange-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-bg-card border border-bg-border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{fmtPrice(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingDown className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold text-white">Evolucao de precos</h2>
          <span className="ml-auto text-xs text-gray-500">{history.length} observacoes</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <PriceChart
            data={history}
            baseline={baseline?.median}
            p10={baseline?.p10}
          />
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-bg-border">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-4 h-0.5 bg-accent inline-block" />
            Preco observado
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-4 h-0.5 bg-accent border-t-2 border-dashed border-accent inline-block" />
            Mediana baseline
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-4 h-0.5 bg-green-500 inline-block" />
            Percentil 10
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
            Oportunidade (&lt;70% da mediana)
          </div>
        </div>
      </div>

      {/* Recent observations */}
      <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-bg-border">
          <h2 className="text-sm font-bold text-white">Observacoes Recentes</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : observations.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Sem observacoes para esta rota.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bg-border">
                  {['Coletado em', 'Preco', 'Airline', 'Paradas', 'Embarque', 'Retorno'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {observations.map(obs => (
                  <tr key={obs.id} className="border-b border-bg-border/50 hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(obs.collected_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-white">
                      {fmtPrice(obs.price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{obs.airline}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {obs.stops === 0 ? 'Direto' : `${obs.stops}x`}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{obs.departure_at}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{obs.return_at ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
