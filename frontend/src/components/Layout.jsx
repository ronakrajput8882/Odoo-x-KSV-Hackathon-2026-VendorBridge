import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Building2, LayoutDashboard, Users, FileText,
  MessageSquare, CheckSquare, ShoppingBag, Activity,
  LogOut, Menu, X, ChevronDown,ArrowUpDown,BarChart2  
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',       roles: ['admin','officer','manager','vendor'] },
  { to: '/vendors',    icon: Users,            label: 'Vendors',         roles: ['admin','officer'] },
  { to: '/rfq',        icon: FileText,         label: 'RFQs',            roles: ['admin','officer','vendor'] },
  { to: '/quotations', icon: MessageSquare,    label: 'Quotations',      roles: ['admin','officer','vendor'] },
  { to: '/compare', icon: ArrowUpDown, label: 'Compare Quotes', roles: ['admin','officer','manager'] },
  { to: '/approvals',  icon: CheckSquare,      label: 'Approvals',       roles: ['admin','manager'] },
  { to: '/orders',     icon: ShoppingBag,      label: 'Orders & Invoices', roles: ['admin','officer','manager'] },
  { to: '/logs',       icon: Activity,         label: 'Activity Logs',   roles: ['admin','manager'] },
  { to: '/reports', icon: BarChart2, label: 'Reports', roles: ['admin','manager','officer'] },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate          = useNavigate()
  const [open, setOpen]   = useState(false)

  const filtered = NAV.filter(n => n.roles.includes(user?.role))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleBadge = {
    admin:   'badge-red',
    officer: 'badge-blue',
    manager: 'badge-yellow',
    vendor:  'badge-green',
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-navy flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">VendorBridge</span>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filtered.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-accent text-sm font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <span className={`text-xs capitalize ${roleBadge[user?.role]}`}>{user?.role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Overlay (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button onClick={() => setOpen(true)} className="lg:hidden text-gray-500 hover:text-navy">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{user?.name}</span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}