import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Binoculars,
  Zap,
  Settings,
  Plane,
  Radio,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getOpportunities } from '../api/client'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/watchlist', icon: Binoculars, label: 'Watchlist' },
  { to: '/opportunities', icon: Zap, label: 'Oportunidades' },
  { to: '/settings', icon: Settings, label: 'Configuracoes' },
]

export default function Sidebar() {
  const [oppCount, setOppCount] = useState<number>(0)

  useEffect(() => {
    getOpportunities({ dismissed: false })
      .then(data => setOppCount(data.filter(o => o.expiry_status !== 'expired').length))
      .catch(() => {})
  }, [])

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-bg-card border-r border-bg-border py-6 px-3 fixed left-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
          <Plane className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Caça Passagem</p>
          <p className="text-xs font-medium text-accent-light leading-tight">da Dani</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                isActive
                  ? 'bg-accent/20 text-accent-light'
                  : 'text-gray-400 hover:text-white hover:bg-bg-hover'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            {label === 'Oportunidades' && oppCount > 0 && (
              <span className="ml-auto bg-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {oppCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status indicator */}
      <div className="px-3 py-3 bg-bg-base rounded-lg border border-bg-border mt-4">
        <div className="flex items-center gap-2 mb-1">
          <Radio className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-semibold text-green-400">Monitorando</span>
        </div>
        <p className="text-xs text-gray-500">6 rotas ativas</p>
        <p className="text-xs text-gray-600 mt-0.5">Ultima coleta: agora</p>
      </div>
    </aside>
  )
}
