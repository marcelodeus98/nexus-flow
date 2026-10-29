import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiStatus } from './api-status'

function renderWithQuery() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ApiStatus />
    </QueryClientProvider>,
  )
}

describe('ApiStatus', () => {
  it('shows the API as up when /health reports ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    )
    renderWithQuery()
    expect(await screen.findByText('API e banco operando')).toBeInTheDocument()
  })

  it('shows the API as down when /health fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'error' }), { status: 503 }),
    )
    renderWithQuery()
    expect(await screen.findByText('API indisponível')).toBeInTheDocument()
  })
})
