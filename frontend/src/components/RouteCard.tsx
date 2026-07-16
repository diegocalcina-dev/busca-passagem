import { Link } from 'react-router-dom'
import { ArrowRight, ToggleLeft, ToggleRight, Trash2, Pencil, Check, X, Settings2 } from 'lucide-react'
import { Target, toggleTarget, deleteTarget, updateTarget } from '../api/client'
import { useState, useRef, useEffect } from 'react'

interface Props {
  target: Target
  onUpdate?: (updated: Target) => void
  onDelete?: (id: number) => void
  onEdit?: () => void
}

export default function RouteCard({ target, onUpdate, onDelete, onEdit }: Props) {
  const [loading, setLoading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(target.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) inputRef.current?.focus()
  }, [editingName])

  const handleSaveName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === target.name) {
      setNameValue(target.name)
      setEditingName(false)
      return
    }
    setLoading(true)
    try {
      const updated = await updateTarget(target.id, { name: trimmed })
      onUpdate?.(updated)
    } catch {
      setNameValue(target.name)
    } finally {
      setLoading(false)
      setEditingName(false)
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName()
    if (e.key === 'Escape') { setNameValue(target.name); setEditingName(false) }
  }

  const origins = (() => {
    try { return JSON.parse(target.origins) as string[] } catch { return [] }
  })()
  const cabins = (() => {
    try { return JSON.parse(target.cabins) as string[] } catch { return [] }
  })()

  const cabinLabel = cabins
    .map(c => ({ economy: 'Economy', business: 'Business', premium: 'Premium', first: '1a Classe' }[c] || c))
    .join(', ')

  const handleToggle = async () => {
    setLoading(true)
    try {
      const updated = await toggleTarget(target.id)
      onUpdate?.(updated)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Remover "${target.name}"?`)) return
    setLoading(true)
    try {
      await deleteTarget(target.id)
      onDelete?.(target.id)
    } catch (err: any) {
      const msg = err?.response?.status === 404
        ? 'Rota não encontrada — recarregue a página.'
        : 'Erro ao remover rota. Tente novamente.'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-bg-card border rounded-xl p-4 flex flex-col gap-3 transition-all ${target.active ? 'border-bg-border' : 'border-bg-border/40 opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleSaveName}
                className="flex-1 min-w-0 bg-bg-base border border-accent rounded px-2 py-0.5 text-sm font-semibold text-white focus:outline-none"
              />
              <button onClick={handleSaveName} className="text-green-400 hover:text-green-300 shrink-0">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setNameValue(target.name); setEditingName(false) }} className="text-gray-500 hover:text-gray-300 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <h3 className="font-semibold text-white truncate">{target.name}</h3>
              <button
                onClick={() => setEditingName(true)}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-300 transition-opacity shrink-0"
                title="Renomear"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            {origins.join(', ')} → {target.destination}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggle}
            disabled={loading}
            title={target.active ? 'Desativar' : 'Ativar'}
            className={`transition-colors ${target.active ? 'text-accent' : 'text-gray-600'} hover:text-accent-light disabled:opacity-50`}
          >
            {target.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
          </button>
          <button
            onClick={onEdit}
            disabled={loading}
            title="Editar rota"
            className="text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="bg-bg-base text-gray-400 px-2 py-0.5 rounded-full">{cabinLabel}</span>
        <span className="bg-bg-base text-gray-400 px-2 py-0.5 rounded-full">
          {target.date_from} - {target.date_to}
        </span>
        {target.price_ceiling && (
          <span className="bg-bg-base text-gray-400 px-2 py-0.5 rounded-full">
            Teto: {target.price_ceiling.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </span>
        )}
      </div>

      {target.destination !== 'ANY' && (
        <Link
          to={`/routes/${origins[0]}/${target.destination}`}
          className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-light transition-colors self-start"
        >
          Ver historico de precos
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}
