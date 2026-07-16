import { useState } from 'react'
import { X, Plus, Edit3 } from 'lucide-react'
import { createTarget, updateTarget, Target, TargetCreate } from '../api/client'

interface Props {
  onClose: () => void
  onSaved: (target: Target) => void
  initialTarget?: Target
}

const ORIGINS_OPTIONS = ['GRU', 'CGH', 'GIG', 'VCP', 'BSB', 'SSA', 'REC', 'FOR', 'CWB', 'POA']

const DESTINATION_GROUPS = [
  {
    label: 'Brasil',
    airports: [
      { code: 'GRU', city: 'São Paulo' },
      { code: 'CGH', city: 'São Paulo (Congonhas)' },
      { code: 'VCP', city: 'Campinas' },
      { code: 'GIG', city: 'Rio de Janeiro' },
      { code: 'SDU', city: 'Rio de Janeiro (Santos Dumont)' },
      { code: 'BSB', city: 'Brasília' },
      { code: 'SSA', city: 'Salvador' },
      { code: 'REC', city: 'Recife' },
      { code: 'FOR', city: 'Fortaleza' },
      { code: 'BEL', city: 'Belém' },
      { code: 'MAO', city: 'Manaus' },
      { code: 'CWB', city: 'Curitiba' },
      { code: 'POA', city: 'Porto Alegre' },
      { code: 'FLN', city: 'Florianópolis' },
      { code: 'CNF', city: 'Belo Horizonte' },
    ],
  },
  {
    label: 'Europa',
    airports: [
      { code: 'LIS', city: 'Lisboa' },
      { code: 'MAD', city: 'Madrid' },
      { code: 'CDG', city: 'Paris' },
      { code: 'LHR', city: 'Londres' },
      { code: 'FCO', city: 'Roma' },
      { code: 'AMS', city: 'Amsterdam' },
      { code: 'FRA', city: 'Frankfurt' },
      { code: 'BCN', city: 'Barcelona' },
      { code: 'MXP', city: 'Milão' },
      { code: 'ATH', city: 'Atenas' },
    ],
  },
  {
    label: 'América do Norte',
    airports: [
      { code: 'MIA', city: 'Miami' },
      { code: 'JFK', city: 'Nova York' },
      { code: 'LAX', city: 'Los Angeles' },
      { code: 'MCO', city: 'Orlando' },
      { code: 'ORD', city: 'Chicago' },
      { code: 'YYZ', city: 'Toronto' },
      { code: 'CUN', city: 'Cancún' },
    ],
  },
  {
    label: 'América do Sul',
    airports: [
      { code: 'EZE', city: 'Buenos Aires' },
      { code: 'SCL', city: 'Santiago' },
      { code: 'LIM', city: 'Lima' },
      { code: 'BOG', city: 'Bogotá' },
      { code: 'MVD', city: 'Montevideo' },
    ],
  },
  {
    label: 'Ásia & Oriente Médio',
    airports: [
      { code: 'NRT', city: 'Tóquio' },
      { code: 'ICN', city: 'Seul' },
      { code: 'DXB', city: 'Dubai' },
      { code: 'DOH', city: 'Doha' },
      { code: 'BKK', city: 'Bangkok' },
      { code: 'SIN', city: 'Singapura' },
    ],
  },
  {
    label: 'África',
    airports: [
      { code: 'JNB', city: 'Johannesburgo' },
      { code: 'CPT', city: 'Cidade do Cabo' },
    ],
  },
]

const CABIN_OPTIONS = [
  { value: 'economy', label: 'Economica' },
  { value: 'premium', label: 'Premium Economy' },
  { value: 'business', label: 'Executiva' },
  { value: 'first', label: 'Primeira Classe' },
]
const CURRENCY_OPTIONS = ['BRL', 'USD', 'EUR', 'GBP']

const ALL_DEST_CODES = new Set(DESTINATION_GROUPS.flatMap(g => g.airports.map(a => a.code)))

function parseJsonArray(raw: string): string[] {
  try { return JSON.parse(raw) } catch { return [] }
}

function initForm(t?: Target) {
  if (t) {
    return {
      name: t.name,
      origins: parseJsonArray(t.origins),
      destination: t.destination,
      one_way: t.one_way,
      date_from: t.date_from?.slice(0, 10) ?? '',
      date_to: t.date_to?.slice(0, 10) ?? '',
      stay_min: t.stay_min,
      stay_max: t.stay_max,
      cabins: parseJsonArray(t.cabins),
      max_stops: t.max_stops,
      passengers: t.passengers,
      currencies: parseJsonArray(t.currencies),
      price_ceiling: t.price_ceiling != null ? String(t.price_ceiling) : '',
    }
  }
  return {
    name: '',
    origins: ['GRU'] as string[],
    destination: '',
    one_way: false,
    date_from: '',
    date_to: '',
    stay_min: 5,
    stay_max: 14,
    cabins: ['economy'] as string[],
    max_stops: 1,
    passengers: 1,
    currencies: ['BRL'] as string[],
    price_ceiling: '',
  }
}

export default function AddTargetModal({ onClose, onSaved, initialTarget }: Props) {
  const isEdit = !!initialTarget
  const [form, setForm] = useState(() => initForm(initialTarget))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.destination || !form.date_from || !form.date_to) {
      setError('Preencha todos os campos obrigatorios.')
      return
    }
    if (form.origins.length === 0) {
      setError('Selecione pelo menos uma origem.')
      return
    }
    if (form.cabins.length === 0) {
      setError('Selecione pelo menos uma cabine.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload: TargetCreate = {
        ...form,
        destination: form.destination.toUpperCase().trim(),
        price_ceiling: form.price_ceiling ? parseFloat(form.price_ceiling) : null,
      }
      const result = isEdit
        ? await updateTarget(initialTarget!.id, payload)
        : await createTarget(payload)
      onSaved(result)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao salvar. Tente novamente.')
      setSubmitting(false)
    }
  }

  const customDest = form.destination && !ALL_DEST_CODES.has(form.destination) && form.destination !== 'ANY'
    ? form.destination
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-bg-card border border-bg-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bg-border sticky top-0 bg-bg-card z-10">
          <div className="flex items-center gap-2">
            {isEdit
              ? <Edit3 className="w-5 h-5 text-accent" />
              : <Plus className="w-5 h-5 text-accent" />
            }
            <h2 className="text-base font-bold text-white">
              {isEdit ? 'Editar Rota' : 'Adicionar Rota'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nome amigavel *</label>
            <input
              type="text"
              placeholder="ex: GRU → Lisboa julho 2026"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Origens */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Aeroportos de origem *</label>
            <div className="flex flex-wrap gap-2">
              {ORIGINS_OPTIONS.map(code => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, origins: toggleArray(f.origins, code) }))}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    form.origins.includes(code)
                      ? 'bg-accent/20 border-accent text-accent-light'
                      : 'border-bg-border text-gray-500 hover:text-white'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {/* Destino */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Destino *</label>

            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, destination: f.destination === 'ANY' ? '' : 'ANY' }))}
              className={`mb-3 w-full py-2 rounded-lg text-xs font-semibold border transition-colors ${
                form.destination === 'ANY'
                  ? 'bg-accent/20 border-accent text-accent-light'
                  : 'border-bg-border text-gray-500 hover:text-white'
              }`}
            >
              Qualquer destino (ANY) — descoberta ampla
            </button>

            {form.destination !== 'ANY' && (
              <div className="flex flex-col gap-3">
                {DESTINATION_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-xs text-gray-600 mb-1.5">{group.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.airports.map(({ code, city }) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, destination: code }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            form.destination === code
                              ? 'bg-accent/20 border-accent text-accent-light'
                              : 'border-bg-border text-gray-500 hover:text-white'
                          }`}
                          title={city}
                        >
                          {code}
                          <span className="hidden sm:inline text-gray-600"> · {city}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <p className="text-xs text-gray-600 mb-1.5">Outro (código IATA)</p>
                  <input
                    type="text"
                    placeholder="ex: FCO, YYZ, HKG..."
                    value={customDest}
                    onChange={e => setForm(f => ({ ...f, destination: e.target.value.toUpperCase().slice(0, 3) }))}
                    className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent uppercase"
                  />
                </div>
              </div>
            )}

            {form.destination && (
              <p className="mt-2 text-xs text-accent-light">
                Destino selecionado: <strong>{form.destination}</strong>
              </p>
            )}
          </div>

          {/* Tipo */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, one_way: false }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                !form.one_way ? 'bg-accent/20 border-accent text-accent-light' : 'border-bg-border text-gray-500'
              }`}
            >
              Ida e volta
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, one_way: true }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                form.one_way ? 'bg-accent/20 border-accent text-accent-light' : 'border-bg-border text-gray-500'
              }`}
            >
              Somente ida
            </button>
          </div>

          {/* Periodo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Data de inicio *</label>
              <input
                type="date"
                value={form.date_from}
                onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))}
                className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Data de fim *</label>
              <input
                type="date"
                value={form.date_to}
                onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))}
                className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Estadia */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Estadia min (dias)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={form.stay_min}
                onChange={e => setForm(f => ({ ...f, stay_min: parseInt(e.target.value) || 1 }))}
                className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Estadia max (dias)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={form.stay_max}
                onChange={e => setForm(f => ({ ...f, stay_max: parseInt(e.target.value) || 14 }))}
                className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Cabines */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Cabines *</label>
            <div className="grid grid-cols-2 gap-2">
              {CABIN_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                    form.cabins.includes(value)
                      ? 'bg-accent/20 border-accent text-accent-light'
                      : 'border-bg-border text-gray-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.cabins.includes(value)}
                    onChange={() => setForm(f => ({ ...f, cabins: toggleArray(f.cabins, value) }))}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Max stops + passengers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Max. paradas</label>
              <select
                value={form.max_stops}
                onChange={e => setForm(f => ({ ...f, max_stops: parseInt(e.target.value) }))}
                className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              >
                <option value={0}>Direto</option>
                <option value={1}>1 parada</option>
                <option value={2}>2 paradas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Passageiros</label>
              <input
                type="number"
                min={1}
                max={9}
                value={form.passengers}
                onChange={e => setForm(f => ({ ...f, passengers: parseInt(e.target.value) || 1 }))}
                className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Moedas */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Moedas</label>
            <div className="flex gap-2">
              {CURRENCY_OPTIONS.map(cur => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, currencies: toggleArray(f.currencies, cur) }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.currencies.includes(cur)
                      ? 'bg-accent/20 border-accent text-accent-light'
                      : 'border-bg-border text-gray-500 hover:text-white'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          {/* Price ceiling */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Teto de preco (opcional)</label>
            <input
              type="number"
              min={0}
              placeholder="ex: 2500"
              value={form.price_ceiling}
              onChange={e => setForm(f => ({ ...f, price_ceiling: e.target.value }))}
              className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-bg-border text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
