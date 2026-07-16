import { Outlet, NavLink } from 'react-router-dom'
import Sidebar from './Sidebar'
import { LayoutDashboard, Binoculars, Zap, Settings } from 'lucide-react'

const MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/watchlist', icon: Binoculars, label: 'Watchlist' },
  { to: '/opportunities', icon: Zap, label: 'Alertas' },
  { to: '/settings', icon: Settings, label: 'Config' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />

      {/* Main content — offset for sidebar on desktop */}
      <main className="flex-1 lg:ml-56 min-h-screen pb-20 lg:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-bg-card border-t border-bg-border z-50">
        <div className="flex">
          {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  isActive ? 'text-accent-light' : 'text-gray-500'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
