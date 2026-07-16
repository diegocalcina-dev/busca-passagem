import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from 'recharts'
import { PriceHistoryPoint } from '../api/client'

interface Props {
  data: PriceHistoryPoint[]
  baseline?: number
  p10?: number
}

function fmtPrice(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const point = payload[0].payload as PriceHistoryPoint
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-3 text-sm shadow-lg">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-white font-bold">{fmtPrice(point.price)}</p>
      <p className="text-gray-400 text-xs">{point.airline}</p>
    </div>
  )
}

function CustomDot(props: any) {
  const { cx, cy, payload, baseline } = props
  const isOpportunity = baseline && payload.price < baseline * 0.7

  if (isOpportunity) {
    return <circle cx={cx} cy={cy} r={5} fill="#f97316" stroke="#f97316" strokeWidth={2} opacity={0.9} />
  }
  return <circle cx={cx} cy={cy} r={2.5} fill="#6366f1" opacity={0.6} />
}

export default function PriceChart({ data, baseline, p10 }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        Sem dados de historico para exibir
      </div>
    )
  }

  const prices = data.map(d => d.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const yMin = Math.floor(minPrice * 0.9 / 500) * 500
  const yMax = Math.ceil(maxPrice * 1.1 / 500) * 500

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#2a2d3e' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[yMin, yMax]}
          tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#2a2d3e' }}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />

        {baseline && (
          <ReferenceLine
            y={baseline}
            stroke="#6366f1"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Mediana ${fmtPrice(baseline)}`,
              position: 'right',
              fontSize: 10,
              fill: '#818cf8',
            }}
          />
        )}

        {p10 && (
          <ReferenceLine
            y={p10}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: `P10 ${fmtPrice(p10)}`,
              position: 'right',
              fontSize: 10,
              fill: '#22c55e',
            }}
          />
        )}

        <Line
          type="monotone"
          dataKey="price"
          stroke="#6366f1"
          strokeWidth={2}
          dot={(props) => <CustomDot {...props} baseline={baseline} />}
          activeDot={{ r: 5, fill: '#818cf8' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
