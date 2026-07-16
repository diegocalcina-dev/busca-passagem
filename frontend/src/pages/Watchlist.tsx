import { useEffect, useState } from 'react'
import { Plus, Binoculars } from 'lucide-react'
import { getTargets, Target } from '../api/client'
import RouteCard from '../components/RouteCard'
import AddTargetModal from '../components/AddTargetModal'

export default function Watchlist() {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTarget, setEditingTarget] = useState<Target | null>(null)

  useEffect(() => {
    getTargets()
      .then(setTargets)
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (target: Target) => {
    setTargets(prev => {
      const exists = prev.some(t => t.id === target.id)
      return exists
        ? prev.map(t => (t.id === target.id ? target : t))
        : [target, ...prev]
    })
  }

  const handleUpdate = (updated: Target) => {
    setTargets(prev => prev.map(t => (t.id === updated.id ? updated : t)))
  }

  const handleDelete = (id: number) => {
    setTargets(prev => prev.filter(t => t.id !== id))
  }

  const active = targets.filter(t => t.active)
  const inactive = targets.filter(t => !t.active)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Watchlist</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {targets.length} rotas configuradas · {active.length} ativas
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Rota
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : targets.length === 0 ? (
        <div className="bg-bg-card border border-bg-border rounded-xl p-12 text-center">
          <Binoculars className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Nenhuma rota na watchlist</p>
          <p className="text-gray-600 text-sm mt-1 mb-5">
            Adicione rotas para comecar a monitorar precos.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar primeira rota
          </button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Ativas ({active.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map(t => (
                  <RouteCard
                    key={t.id}
                    target={t}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onEdit={() => setEditingTarget(t)}
                  />
                ))}
              </div>
            </section>
          )}

          {inactive.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Pausadas ({inactive.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactive.map(t => (
                  <RouteCard
                    key={t.id}
                    target={t}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onEdit={() => setEditingTarget(t)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {showModal && (
        <AddTargetModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {editingTarget && (
        <AddTargetModal
          onClose={() => setEditingTarget(null)}
          onSaved={t => { handleSaved(t); setEditingTarget(null) }}
          initialTarget={editingTarget}
        />
      )}
    </div>
  )
}
