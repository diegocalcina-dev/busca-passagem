import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Bell, Database, Radio, AlertTriangle, Save, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { getIntegrationsStatus, IntegrationsStatus } from '../api/client'

interface SettingsSectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function Section({ title, icon, children }: SettingsSectionProps) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 p-4 border-b border-bg-border bg-bg-hover/30">
        <span className="text-accent">{icon}</span>
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      <div className="p-5 flex flex-col gap-5">{children}</div>
    </div>
  )
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-sm text-gray-300">{label}</label>
        <span className="text-sm font-bold text-accent-light">
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  )
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function TextField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent"
      />
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-gray-300 font-medium">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-accent' : 'bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  return `há ${Math.floor(hrs / 24)}d`
}

function formatNext(iso: string | null): string {
  if (!iso) return '—'
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'em breve'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `em ${mins} min`
  return `em ${Math.floor(mins / 60)}h${mins % 60 > 0 ? String(mins % 60).padStart(2, '0') + 'min' : ''}`
}

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null)
  const [loadingInt, setLoadingInt] = useState(true)

  const fetchIntegrations = () => {
    setLoadingInt(true)
    getIntegrationsStatus()
      .then(setIntegrations)
      .catch(() => {})
      .finally(() => setLoadingInt(false))
  }

  useEffect(() => { fetchIntegrations() }, [])

  const [promoThreshold, setPromoThreshold] = useState(40)
  const [baselineWindow, setBaselineWindow] = useState('90')
  const [collectionFreq, setCollectionFreq] = useState('6')
  const [alertCooldown, setAlertCooldown] = useState(4)

  const [telegramToken, setTelegramToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [smtpEmail, setSmtpEmail] = useState('')
  const [alertEmail, setAlertEmail] = useState('')

  const [strategyA1, setStrategyA1] = useState(() =>
    localStorage.getItem('strategy_a1') !== 'false'
  )
  const [strategyA2, setStrategyA2] = useState(false)

  const handleToggleA1 = (v: boolean) => {
    setStrategyA1(v)
    localStorage.setItem('strategy_a1', String(v))
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuracoes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Parametros do sistema de monitoramento</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            saved
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-accent hover:bg-accent-hover text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {/* Detection */}
      <Section title="Deteccao de Oportunidades" icon={<SettingsIcon className="w-4 h-4" />}>
        <SliderField
          label="Limiar de promocao padrao"
          value={promoThreshold}
          onChange={setPromoThreshold}
          min={20}
          max={80}
          suffix="%"
        />
        <p className="text-xs text-gray-600 -mt-3">
          Percentual abaixo da mediana para classificar como oportunidade. Recomendado: 40%.
        </p>

        <SelectField
          label="Janela de baseline (dias)"
          value={baselineWindow}
          onChange={setBaselineWindow}
          options={[
            { value: '30', label: '30 dias' },
            { value: '60', label: '60 dias' },
            { value: '90', label: '90 dias (recomendado)' },
          ]}
        />

        <SelectField
          label="Frequencia de coleta"
          value={collectionFreq}
          onChange={setCollectionFreq}
          options={[
            { value: '1', label: 'A cada 1 hora' },
            { value: '3', label: 'A cada 3 horas' },
            { value: '6', label: 'A cada 6 horas (recomendado)' },
            { value: '12', label: 'A cada 12 horas' },
            { value: '24', label: 'Uma vez ao dia' },
          ]}
        />

        <SliderField
          label="Cooldown de alerta"
          value={alertCooldown}
          onChange={setAlertCooldown}
          min={1}
          max={24}
          suffix="h"
        />
        <p className="text-xs text-gray-600 -mt-3">
          Tempo minimo entre alertas para a mesma rota.
        </p>
      </Section>

      {/* Notifications */}
      <Section title="Alertas e Notificacoes" icon={<Bell className="w-4 h-4" />}>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Telegram</p>
          <div className="flex flex-col gap-3">
            <TextField
              label="Bot Token"
              placeholder="123456789:ABCdef..."
              value={telegramToken}
              onChange={setTelegramToken}
            />
            <TextField
              label="Chat ID"
              placeholder="-100123456789"
              value={telegramChatId}
              onChange={setTelegramChatId}
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">E-mail (Gmail)</p>
          <div className="flex flex-col gap-3">
            <TextField
              label="Conta Gmail"
              type="email"
              placeholder="seu@gmail.com"
              value={smtpEmail}
              onChange={setSmtpEmail}
            />
            <TextField
              label="Destino dos alertas"
              type="email"
              placeholder="destino@email.com"
              value={alertEmail}
              onChange={setAlertEmail}
            />
          </div>
        </div>
      </Section>

      {/* Data */}
      <Section title="Dados e Integração" icon={<Database className="w-4 h-4" />}>
        {/* Header com refresh */}
        <div className="flex items-center justify-between -mt-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fontes de dados</p>
          <button
            onClick={fetchIntegrations}
            disabled={loadingInt}
            className="text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40"
            title="Atualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingInt ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Providers */}
        <div className="flex flex-col gap-2">
          {integrations && Object.values(integrations.providers).map(p => (
            <div key={p.label} className="flex items-center justify-between p-3 bg-bg-base rounded-lg border border-bg-border">
              <div>
                <p className="text-sm text-gray-300 font-medium">{p.label}</p>
                <p className="text-xs text-gray-600">{p.description}</p>
                {p.configured && p.observations > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">{p.observations.toLocaleString('pt-BR')} observações coletadas</p>
                )}
              </div>
              {p.configured ? (
                <div className="flex items-center gap-1.5 text-green-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold">Ativo</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-gray-600 shrink-0">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold">Não configurado</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Canais de alerta</p>
          <div className="flex flex-col gap-2">
            {integrations && Object.values(integrations.alerts).map(a => (
              <div key={a.label} className="flex items-center justify-between p-3 bg-bg-base rounded-lg border border-bg-border">
                <p className="text-sm text-gray-300 font-medium">{a.label}</p>
                {a.configured ? (
                  <div className="flex items-center gap-1.5 text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-semibold">Ativo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold">Não configurado</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* DB stats */}
        {integrations && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Banco de dados</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-bg-base rounded-lg border border-bg-border">
                <p className="text-xs text-gray-500 mb-0.5">Observações reais</p>
                <p className="text-lg font-bold text-white">{integrations.database.real_observations.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-bg-base rounded-lg border border-bg-border">
                <p className="text-xs text-gray-500 mb-0.5">Total no banco</p>
                <p className="text-lg font-bold text-white">{integrations.database.total_observations.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-bg-base rounded-lg border border-bg-border">
                <p className="text-xs text-gray-500 mb-0.5">Última coleta</p>
                <p className="text-sm font-semibold text-gray-300">{formatRelative(integrations.database.last_collection)}</p>
              </div>
              <div className="p-3 bg-bg-base rounded-lg border border-bg-border">
                <p className="text-xs text-gray-500 mb-0.5">Próxima coleta</p>
                <p className="text-sm font-semibold text-gray-300">{formatNext(integrations.database.next_collection)}</p>
              </div>
            </div>
          </div>
        )}

        {loadingInt && !integrations && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </Section>

      {/* Advanced */}
      <Section title="Estrategias Avancadas" icon={<Radio className="w-4 h-4" />}>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-400">
            Estrategias avancadas podem acionar compras automaticas ou deteccao agressiva de tarifas com erro. Use com cautela.
          </p>
        </div>

        <Toggle
          label="Estrategia A1 — Deteccao de Tarifa com Erro"
          description="Exibe oportunidades classificadas como tarifa com erro (>60% abaixo da mediana). Desative se quiser ver apenas promocoes normais."
          checked={strategyA1}
          onChange={handleToggleA1}
        />

        <Toggle
          label="Estrategia A2 — Verificacao Cruzada"
          description="Cruza dados Travelpayouts + Kiwi antes de marcar como oportunidade confirmada"
          checked={strategyA2}
          onChange={setStrategyA2}
        />
      </Section>

      {/* Info */}
      <p className="text-xs text-gray-600 text-center pb-4">
        Versão 0.3.0 — Caça Passagem da Dani
      </p>
    </div>
  )
}
