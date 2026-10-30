import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@/styles/globals.css'
import { theme } from '@/styles/theme'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  )

  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <ModalsProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  )
}
