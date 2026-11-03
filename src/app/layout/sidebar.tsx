import {
  ActionIcon,
  Avatar,
  Box,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import {
  IconBell,
  IconBuilding,
  IconFileExport,
  IconHistory,
  IconLayoutKanban,
  IconLogout,
  IconSchool,
  IconTags,
  IconTestPipe,
  IconUserCog,
  IconUsersGroup,
  type Icon,
} from '@tabler/icons-react'
import { Link, useLocation } from 'react-router-dom'
import { useProjects } from '@/features/projects/api'
import { BrandIcon } from '@/shared/brand/brand-icon'
import { BrandLogo } from '@/shared/brand/brand-logo'
import './sidebar.css'

type NavItem = { to: string; label: string; icon: Icon; end?: boolean }
type NavSection = { title: string; items: NavItem[] }

const MAIN: NavSection = {
  title: 'Principal',
  items: [
    { to: '/', label: 'Projetos', icon: IconLayoutKanban, end: true },
    { to: '/qa', label: 'Fila de testes', icon: IconTestPipe },
    { to: '/exports', label: 'Exportações', icon: IconFileExport },
    { to: '/settings/notifications', label: 'Notificações', icon: IconBell },
    { to: '/help', label: 'Ajuda e treinamento', icon: IconSchool },
  ],
}

const ADMIN: NavSection = {
  title: 'Administração',
  items: [
    { to: '/admin/users', label: 'Usuários', icon: IconUserCog },
    { to: '/admin/departments', label: 'Departamentos', icon: IconBuilding },
    { to: '/admin/teams', label: 'Times', icon: IconUsersGroup },
    { to: '/admin/tags', label: 'Tags', icon: IconTags },
    { to: '/admin/audit', label: 'Auditoria', icon: IconHistory },
  ],
}

// Projects listed in the sidebar; the rest stay one click away in "Projetos".
const MAX_PROJECTS = 8

export type SidebarUser = { name: string; role: string; initials: string }

// Same shell as Nexa Assets: navy sidebar with the brand, sections of links,
// the signed-in user at the bottom. Collapses to icons on desktop and slides
// in as a drawer on phones.
export function Sidebar({
  user,
  isAdmin,
  onLogout,
  collapsed,
  mobileOpen,
  onCloseMobile,
}: {
  user: SidebarUser
  isAdmin: boolean
  onLogout: () => void
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  const { pathname } = useLocation()
  const projects = useProjects()
  const active = (item: NavItem) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)

  const projectItems: NavItem[] = (projects.data ?? [])
    .filter((project) => project.status === 'ACTIVE')
    .slice(0, MAX_PROJECTS)
    .map((project) => ({ to: `/p/${project.key}`, label: project.name, icon: IconLayoutKanban }))
  const sections = [
    MAIN,
    ...(projectItems.length ? [{ title: 'Meus projetos', items: projectItems }] : []),
    ...(isAdmin ? [ADMIN] : []),
  ]

  const className = [
    'sidebar',
    collapsed && 'sidebar--collapsed',
    mobileOpen && 'sidebar--mobile-open',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div
        className={`sidebar__backdrop${mobileOpen ? ' sidebar__backdrop--visible' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <Box component="aside" className={className}>
        <div className="sidebar__brand">
          <BrandIcon className="sidebar__watermark" size={150} />
          <Link to="/" aria-label="Início" onClick={onCloseMobile}>
            <BrandLogo size={collapsed ? 34 : 44} />
          </Link>
        </div>

        <ScrollArea className="sidebar__nav" type="auto">
          <Stack gap="lg" py="md" px="sm" component="nav" aria-label="Menu principal">
            {sections.map((section) => (
              <Stack gap={4} key={section.title}>
                {!collapsed && <Text className="sidebar__section-title">{section.title}</Text>}
                {section.items.map((item) => {
                  const isProject = section.title === 'Meus projetos'
                  const link = (
                    <NavLink
                      key={item.to}
                      component={Link}
                      to={item.to}
                      onClick={onCloseMobile}
                      label={collapsed ? undefined : item.label}
                      aria-label={collapsed ? item.label : undefined}
                      leftSection={
                        isProject && !collapsed ? (
                          <span className="sidebar__project-key">{item.to.slice(3)}</span>
                        ) : (
                          <item.icon size={20} stroke={2} />
                        )
                      }
                      active={active(item)}
                    />
                  )
                  if (!collapsed) return link
                  return (
                    <Tooltip key={item.to} label={item.label} position="right" withArrow>
                      {link}
                    </Tooltip>
                  )
                })}
              </Stack>
            ))}
          </Stack>
        </ScrollArea>

        <Group className="sidebar__footer" gap="sm" wrap="nowrap">
          <Avatar radius="xl" color="brand" variant="filled">
            {user.initials}
          </Avatar>
          {!collapsed && (
            <Stack gap={0} className="sidebar__user">
              <Text size="sm" fw={600} c="white" truncate>
                {user.name}
              </Text>
              <Text size="xs" c="rgba(255,255,255,0.5)">
                {user.role}
              </Text>
            </Stack>
          )}
          <ActionIcon
            variant="subtle"
            c="rgba(255,255,255,0.5)"
            aria-label="Sair"
            onClick={onLogout}
          >
            <IconLogout size={16} stroke={1.6} />
          </ActionIcon>
        </Group>
      </Box>
    </>
  )
}
