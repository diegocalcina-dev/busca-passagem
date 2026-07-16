import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { createTarget, Target } from '../api/client'

interface Props {
  onClose: () => void
  onCreated: (target: Target) => void
}

const ORIGINS_OPTIONS = ['GRU', 'CGH', 'GIG', 'VCP', 'BSB', 'SSA', 'REC', 'FOR', 'CWB', 'POA']
const CABIN_OPTIONS = [
  { value: 'economy', label: 'Economica' },
  { value: 'premium', label: 'Premium Economy' },
  { value: 'business', label: 'Executiva' },
  { value: 'first', label: 'Primeira Classe' },
]
const CURRENCY_OPTIONS = ['BRL', 'USD', 'EUR', 'GBP']

export default function AddTargetModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
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
  })
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
      const created = await createTarget({
        ...form,
        destination: form.destination.toUpperCase().trim(),
        price_ceiling: form.price_ceiling ? parseFloat(form.price_ceiling) : null,
      })
      onCreated(created)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao criar alvo. Tente novamente.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-bg-card border border-bg-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bg-border sticky top-0 bg-bg-card z-10">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-accent" />
            <h2 className="text-base font-bold text-white">Adicionar Rota</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
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
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Destino (IATA ou ANY) *</label>
            <input
              type="text"
              placeholder="ex: LIS, MIA, NRT, ANY"
              value={form.destination}
              onChange={e => setForm(f => ({ ...f, destination: e.target.value.toUpperCase() }))}
              maxLength={3}
              className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent uppercase"
            />
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

          {/* Submit */}
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
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
