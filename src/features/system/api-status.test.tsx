import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'
import { ApiStatus } from './api-status'

describe('ApiStatus', () => {
  it('shows the API as up when /health reports ok', async () => {
    mockApi(() => [200, { status: 'ok' }])
    renderWithProviders(<ApiStatus />)
    expect(await screen.findByRole('status', { name: 'API e banco operando' })).toBeInTheDocument()
  })

  it('shows the API as down when /health fails', async () => {
    mockApi(() => [503, { status: 'error' }])
    renderWithProviders(<ApiStatus />)
    expect(await screen.findByRole('status', { name: 'API indisponível' })).toBeInTheDocument()
  })
})
