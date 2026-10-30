import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { theme } from '@/styles/theme'

// Renders with what every screen needs: the Mantine theme and a fresh,
// retry-free query client.
export function renderWithProviders(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MantineProvider theme={theme}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MantineProvider>,
  )
}
