import { NavLink, Outlet } from 'react-router'

const tabs = [
  { to: '/admin/users', label: 'Usuários' },
  { to: '/admin/departments', label: 'Departamentos' },
  { to: '/admin/teams', label: 'Times' },
  { to: '/admin/audit', label: 'Auditoria' },
]

export function AdminLayout() {
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Administração</h1>
        <nav className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </section>
  )
}
