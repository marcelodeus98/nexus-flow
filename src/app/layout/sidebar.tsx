import {
  ActionIcon,
  Avatar,
  Box,
  Collapse,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import {
  IconBell,
  IconChartBar,
  IconChartDots,
  IconBuilding,
  IconChevronDown,
  IconFileExport,
  IconHistory,
  IconLayoutKanban,
  IconLogout,
  IconMail,
  IconMap,
  IconSchool,
  IconTags,
  IconTestPipe,
  IconUserCog,
  IconUsersGroup,
  type Icon,
} from '@tabler/icons-react'
import { useLocalStorage } from '@mantine/hooks'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useProjects, type ProjectRole } from '@/features/projects/api'
import { useReportTeams } from '@/features/team-reports/api'
import { BrandIcon } from '@/shared/brand/brand-icon'
import { BrandLogo } from '@/shared/brand/brand-logo'
import './sidebar.css'

type NavItem = { to: string; label: string; icon: Icon; end?: boolean }
type NavSection = { title: string; items: NavItem[] }

const EXPORTS: NavItem = { to: '/exports', label: 'Exportações', icon: IconFileExport }

// Exports come from reports, so the link is for whoever can open one: every
// project role but Leitor ('reports:view-own'), team leaders and admins.
const REPORTING_ROLES: ReadonlySet<ProjectRole> = new Set([
  'MANAGER',
  'PRODUCT_OWNER',
  'DEVELOPER',
  'QA',
  'PROCESS',
])

const MAIN: NavSection = {
  title: 'Principal',
  items: [
    { to: '/', label: 'Projetos', icon: IconLayoutKanban, end: true },
    { to: '/team-map', label: 'Mapa da equipe', icon: IconMap },
    { to: '/qa', label: 'Fila de testes', icon: IconTestPipe },
    { to: '/settings/notifications', label: 'Notificações', icon: IconBell },
    { to: '/help', label: 'Ajuda e treinamento', icon: IconSchool },
  ],
}

// Reports above a single project: the admin's overview, the team reports of
// leaders (and admins) and the exports of whoever can produce them.
function reportsSection(access: {
  isAdmin: boolean
  leadsTeam: boolean
  canExport: boolean
}): NavSection | null {
  const items: NavItem[] = [
    ...(access.isAdmin ? [{ to: '/overview', label: 'Visão geral', icon: IconChartDots }] : []),
    ...(access.isAdmin || access.leadsTeam
      ? [{ to: '/team-reports', label: 'Relatórios de equipe', icon: IconChartBar }]
      : []),
    ...(access.canExport ? [EXPORTS] : []),
  ]
  return items.length ? { title: 'Relatórios', items } : null
}

const ADMIN: NavSection = {
  title: 'Administração',
  items: [
    { to: '/admin/users', label: 'Usuários', icon: IconUserCog },
    { to: '/admin/departments', label: 'Departamentos', icon: IconBuilding },
    { to: '/admin/teams', label: 'Times', icon: IconUsersGroup },
    { to: '/admin/tags', label: 'Tags', icon: IconTags },
    { to: '/admin/email', label: 'E-mail (SMTP)', icon: IconMail },
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
  const teams = useReportTeams()
  const leadsTeam = (teams.data ?? []).length > 0
  const canExport =
    isAdmin ||
    leadsTeam ||
    (projects.data ?? []).some(
      (project) => project.myRole !== null && REPORTING_ROLES.has(project.myRole),
    )
  const reports = reportsSection({ isAdmin, leadsTeam, canExport })
  const sections = [
    MAIN,
    ...(reports ? [reports] : []),
    ...(projectItems.length ? [{ title: 'Meus projetos', items: projectItems }] : []),
    ...(isAdmin ? [ADMIN] : []),
  ]

  // Each section folds under its title. The choice is kept per browser; a
  // section nobody touched starts open only if it is "Principal" or holds the
  // current page, and navigating into a closed section opens it.
  const [openSections, setOpenSections] = useLocalStorage<Record<string, boolean>>({
    key: 'nexus-flow:sidebar-sections',
    defaultValue: {},
  })
  const holdsActive = (section: NavSection) => section.items.some(active)
  const isOpen = (section: NavSection) =>
    openSections[section.title] ?? (section.title === MAIN.title || holdsActive(section))
  const toggleSection = (section: NavSection) =>
    setOpenSections((current) => ({ ...current, [section.title]: !isOpen(section) }))

  const activeSection = sections.find(holdsActive)?.title
  useEffect(() => {
    if (!activeSection) return
    setOpenSections((current) =>
      current[activeSection] === false ? { ...current, [activeSection]: true } : current,
    )
  }, [pathname, activeSection, setOpenSections])

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
            {sections.map((section) => {
              const open = collapsed || isOpen(section)
              const panelId = `sidebar-section-${section.title.replace(/\s+/g, '-').toLowerCase()}`
              return (
                <Stack gap={4} key={section.title}>
                  {!collapsed && (
                    <UnstyledButton
                      className="sidebar__section-toggle"
                      onClick={() => toggleSection(section)}
                      aria-expanded={open}
                      aria-controls={panelId}
                    >
                      <Text component="span" className="sidebar__section-title">
                        {section.title}
                      </Text>
                      <IconChevronDown
                        size={14}
                        stroke={2}
                        className="sidebar__section-chevron"
                        data-open={open || undefined}
                      />
                    </UnstyledButton>
                  )}
                  <Collapse expanded={open} id={panelId}>
                    <Stack gap={4}>
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
                  </Collapse>
                </Stack>
              )
            })}
          </Stack>
        </ScrollArea>

        <Group className="sidebar__footer" gap="sm" wrap="nowrap">
          {/* The person opens their own area (profile and daily). */}
          <UnstyledButton
            component={Link}
            to="/me"
            onClick={onCloseMobile}
            className="sidebar__me"
            aria-label={`Minha área: ${user.name}`}
          >
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
          </UnstyledButton>
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
