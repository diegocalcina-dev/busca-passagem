import { useState } from 'react'
import { Settings as SettingsIcon, Bell, Database, Radio, AlertTriangle, Save } from 'lucide-react'

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

export default function Settings() {
  const [saved, setSaved] = useState(false)

  const [promoThreshold, setPromoThreshold] = useState(40)
  const [baselineWindow, setBaselineWindow] = useState('90')
  const [collectionFreq, setCollectionFreq] = useState('6')
  const [alertCooldown, setAlertCooldown] = useState(4)

  const [telegramToken, setTelegramToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [smtpEmail, setSmtpEmail] = useState('')
  const [alertEmail, setAlertEmail] = useState('')

  const [strategyA1, setStrategyA1] = useState(false)
  const [strategyA2, setStrategyA2] = useState(false)

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
      <Section title="Dados e Integracao" icon={<Database className="w-4 h-4" />}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 bg-bg-base rounded-lg border border-bg-border">
            <div>
              <p className="text-sm text-gray-300 font-medium">Travelpayouts API</p>
              <p className="text-xs text-gray-600">Fonte principal de dados</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-medium">
              Nao configurado
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-bg-base rounded-lg border border-bg-border">
            <div>
              <p className="text-sm text-gray-300 font-medium">RapidAPI</p>
              <p className="text-xs text-gray-600">Verificacao de precos ao vivo</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-medium">
              Nao configurado
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-bg-base rounded-lg border border-bg-border">
            <div>
              <p className="text-sm text-gray-300 font-medium">Dados Mock</p>
              <p className="text-xs text-gray-600">Modo de demonstracao ativo</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
              Ativo
            </span>
          </div>
        </div>
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
          description="Detecta precos &gt;60% abaixo da mediana como possiveis erros tarifarios"
          checked={strategyA1}
          onChange={setStrategyA1}
        />

        <Toggle
          label="Estrategia A2 — Monitoramento de Disponibilidade"
          description="Verifica disponibilidade em tempo real antes de alertar (requer API key)"
          checked={strategyA2}
          onChange={setStrategyA2}
        />
      </Section>

      {/* Info */}
      <p className="text-xs text-gray-600 text-center pb-4">
        Versao 0.1.0 — CacaPassagem • Dados mock ativos para demonstracao
      </p>
    </div>
  )
}
