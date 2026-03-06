import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth'
import {
  Users, BarChart3, Send, Wallet, Settings, LogOut, Menu,
  FileText, LayoutDashboard, X, ListFilter, Workflow,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/shared/lib/utils'
import type { UserRole } from '@/shared/types'

interface NavItem {
  name: string
  href: string
  icon: typeof LayoutDashboard
  roles?: UserRole[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contatos', href: '/contacts', icon: Users },
  { name: 'Segmentação', href: '/segmentation', icon: ListFilter },
  { name: 'Automações', href: '/automations', icon: Workflow },
  { name: 'Campanhas', href: '/campaigns', icon: Send },
  { name: 'E-mails', href: '/templates', icon: FileText },
  { name: 'Cashback', href: '/cashback', icon: Wallet },
  { name: 'Relatórios', href: '/reports', icon: BarChart3 },
  { name: 'Configurações', href: '/settings', icon: Settings, roles: ['ADMIN'] },
]

const roleBadgeColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  GESTOR: 'bg-blue-100 text-blue-700',
  OPERADOR: 'bg-slate-100 text-slate-600',
}

export function AppLayout() {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const userRole = useAuthStore((s) => s.userRole)
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const handleLogout = async () => { await logout(); navigate('/login') }

  const visibleNav = navigation.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Compact Top Header */}
      <header className="flex items-center justify-between h-9 px-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-slate-700 lg:hidden cursor-pointer">
            <Menu className="w-4 h-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-botica-700 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-botica-500" />
            BoticaStation v0.37
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {user && (
            <>
              <span className="text-[11px] text-slate-500 hidden sm:inline">{user.email}</span>
              {userRole && (
                <span className={cn('rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wider', roleBadgeColors[userRole])}>
                  {userRole}
                </span>
              )}
            </>
          )}
          <button onClick={handleLogout} className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 transition-colors cursor-pointer" title="Sair">
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-56 flex-col bg-white border-r border-slate-200 transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {/* Mobile close */}
          <div className="flex h-10 items-center justify-end px-3 lg:hidden">
            <button className="text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
            {visibleNav.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-botica-50 text-botica-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Logo — bottom */}
          <div className="flex items-center justify-center px-4 py-4 border-t border-slate-100">
            <img src="/logo-horizontal.svg" alt="Botica Alternativa" className="h-10 w-auto" />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
