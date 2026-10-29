import { useQueryClient } from '@tanstack/react-query'
import { LogOutIcon } from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router'
import { logout } from '@/features/auth/api'
import { ApiStatus } from '@/features/system/api-status'
import { NotificationBell } from '@/features/notifications/notification-bell'
import { SearchDialog } from '@/features/search/search-dialog'
import { TimerWidget } from '@/features/time/timer-widget'
import { useSessionState } from '@/shared/auth/session-store'
import { Button } from '@/shared/ui/button'

export function AppLayout() {
  const session = useSessionState()
  const location = useLocation()
  const queryClient = useQueryClient()

  // The session can end while the app is open (refresh fails, user logs out).
  if (session.status !== 'authenticated') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  const { user } = session.session

  const navItems = [
    { to: '/', label: 'Projetos', end: true },
    ...(user.globalRole === 'ADMIN' ? [{ to: '/admin', label: 'Administração', end: false }] : []),
  ]

  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="flex items-center gap-3 border-b bg-background px-4 py-2 sm:gap-6 sm:px-6">
        <Link to="/" className="shrink-0 text-lg font-semibold">
          Nexa Flow
        </Link>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <SearchDialog />
          <TimerWidget />
          <NotificationBell />
          <div className="hidden lg:block">
            <ApiStatus />
          </div>
          <span className="hidden text-sm text-muted-foreground md:inline">{user.name}</span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Sair"
            onClick={async () => {
              await logout()
              queryClient.clear()
            }}
          >
            <LogOutIcon /> <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>
      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
