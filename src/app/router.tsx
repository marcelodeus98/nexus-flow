import { createBrowserRouter, redirect } from 'react-router-dom'
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page'
import { LoginPage } from '@/features/auth/login-page'
import { ResetPasswordPage } from '@/features/auth/reset-password-page'
import { redirectIfSignedIn, requireAdmin, requireSession } from '@/features/auth/route-guards'
import { BoardPage } from '@/features/board/board-page'
import { ProjectLayout } from '@/features/projects/project-layout'
import { ProjectsPage } from '@/features/projects/projects-page'
import { AppLayout } from './layout/app-layout'
import { NotFoundPage } from './pages/not-found-page'

const boardChildren = [
  { index: true, element: null },
  // The card opens in a drawer over the board.
  {
    path: 'c/:cardNumber',
    lazy: async () => ({
      Component: (await import('@/features/cards/card-drawer')).CardDrawer,
    }),
  },
]

export const router = createBrowserRouter([
  { path: '/login', loader: redirectIfSignedIn, element: <LoginPage /> },
  { path: '/forgot-password', loader: redirectIfSignedIn, element: <ForgotPasswordPage /> },
  // Reachable while signed in too: the link comes from an e-mail.
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    loader: requireSession,
    element: <AppLayout />,
    children: [
      { index: true, element: <ProjectsPage /> },
      {
        path: 'p/:projectKey',
        element: <ProjectLayout />,
        children: [
          // /p/KEY is the default board, /p/KEY/b/:boardId any other one.
          { element: <BoardPage />, children: boardChildren },
          { path: 'b/:boardId', element: <BoardPage />, children: boardChildren },
          {
            path: 'backlog',
            lazy: async () => ({
              Component: (await import('@/features/sprints/backlog-page')).BacklogPage,
            }),
          },
          {
            path: 'tests',
            lazy: async () => ({
              Component: (await import('@/features/qa/test-cases-page')).TestCasesPage,
            }),
          },
          {
            path: 'reports',
            lazy: async () => ({
              Component: (await import('@/features/reports/project-reports-page'))
                .ProjectReportsPage,
            }),
          },
          {
            path: 'sprints/:sprintId',
            lazy: async () => ({
              Component: (await import('@/features/sprints/sprint-report-page')).SprintReportPage,
            }),
          },
          {
            path: 'settings',
            lazy: async () => ({
              Component: (await import('@/features/projects/settings/project-settings-page'))
                .ProjectSettingsPage,
            }),
          },
        ],
      },
      {
        path: 'help/:topicId?',
        lazy: async () => ({
          Component: (await import('@/features/help/help-page')).HelpPage,
        }),
      },
      {
        path: 'qa',
        lazy: async () => ({
          Component: (await import('@/features/qa/qa-queue-page')).QaQueuePage,
        }),
      },
      {
        path: 'admin',
        loader: requireAdmin,
        // Admin screens are only for a few people: loaded on demand.
        lazy: async () => ({
          Component: (await import('@/features/admin/admin-layout')).AdminLayout,
        }),
        children: [
          { index: true, loader: () => redirect('/admin/users') },
          {
            path: 'users',
            lazy: async () => ({
              Component: (await import('@/features/admin/users-page')).UsersPage,
            }),
          },
          {
            path: 'departments',
            lazy: async () => ({
              Component: (await import('@/features/admin/departments-page')).DepartmentsPage,
            }),
          },
          {
            path: 'audit',
            lazy: async () => ({
              Component: (await import('@/features/admin/audit-page')).AdminAuditPage,
            }),
          },
          {
            path: 'teams',
            lazy: async () => ({
              Component: (await import('@/features/admin/teams-page')).TeamsPage,
            }),
          },
          {
            path: 'tags',
            lazy: async () => ({
              Component: (await import('@/features/admin/tags-page')).TagsPage,
            }),
          },
        ],
      },
      {
        path: 'settings/notifications',
        lazy: async () => ({
          Component: (await import('@/features/notifications/preferences-page'))
            .NotificationPreferencesPage,
        }),
      },
      {
        path: 'exports',
        lazy: async () => ({
          Component: (await import('@/features/reports/exports-page')).ExportsPage,
        }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
