import { useMediaQuery } from '@mantine/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { logout } from '@/features/auth/api'
import { useSessionState } from '@/shared/auth/session-store'
import { Sidebar, type SidebarUser } from './sidebar'
import { TopBar } from './top-bar'
import './app-layout.css'

// What the breadcrumb says for each top-level section.
function pageLabel(pathname: string): string {
  const [first, second] = pathname.split('/').filter(Boolean)
  if (!first) return 'Projetos'
  if (first === 'p') return second ?? 'Projeto'
  if (first === 'admin') return 'Administração'
  if (first === 'exports') return 'Exportações'
  if (first === 'qa') return 'Fila de testes'
  if (first === 'settings') return 'Notificações'
  return ''
}

// The board (/p/KEY, /p/KEY/b/:id, with or without an open card) uses the
// whole width for its columns; every other screen sits in the centred column.
function isBoard(pathname: string): boolean {
  const [first, , third] = pathname.split('/').filter(Boolean)
  return first === 'p' && (third === undefined || third === 'b' || third === 'c')
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export function AppLayout() {
  const session = useSessionState()
  const location = useLocation()
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // The session can end while the app is open (refresh fails, user logs out).
  if (session.status !== 'authenticated') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  const { user } = session.session
  const shellUser: SidebarUser = {
    name: user.name,
    role: user.globalRole === 'ADMIN' ? 'Administrador' : (user.jobTitle ?? 'Usuário'),
    initials: initialsOf(user.name),
  }

  async function handleLogout() {
    await logout()
    queryClient.clear()
  }

  return (
    <div className="app-layout">
      <Sidebar
        user={shellUser}
        isAdmin={user.globalRole === 'ADMIN'}
        onLogout={() => void handleLogout()}
        collapsed={!isMobile && desktopCollapsed}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="app-layout__content">
        <TopBar
          currentLabel={pageLabel(location.pathname)}
          user={shellUser}
          sidebarCollapsed={isMobile ? !mobileMenuOpen : desktopCollapsed}
          onToggleSidebar={() =>
            isMobile ? setMobileMenuOpen((open) => !open) : setDesktopCollapsed((c) => !c)
          }
        />
        <main className="app-layout__main">
          <div
            className={`app-layout__page${isBoard(location.pathname) ? ' app-layout__page--wide' : ''}`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
