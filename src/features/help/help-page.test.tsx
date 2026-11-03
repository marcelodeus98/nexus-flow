import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { theme } from '@/styles/theme'
import { HelpPage } from './help-page'

function renderHelp(path = '/help') {
  const router = createMemoryRouter([{ path: '/help/:topicId?', element: <HelpPage /> }], {
    initialEntries: [path],
  })
  render(
    <MantineProvider theme={theme}>
      <RouterProvider router={router} />
    </MantineProvider>,
  )
}

describe('HelpPage', () => {
  it('opens the topic in the address', () => {
    renderHelp('/help/story-points')
    expect(screen.getByRole('heading', { name: 'Story points e estimativas' })).toBeInTheDocument()
    expect(screen.getByText('O que são story points?')).toBeInTheDocument()
  })

  it('searches every topic, ignoring accents', async () => {
    renderHelp()
    await userEvent.type(screen.getByLabelText('Buscar na ajuda'), 'historia')
    expect(await screen.findByText(/resposta\(s\) para "historia"/)).toBeInTheDocument()
    expect(
      screen.getByText('Como uma história anda pelo sistema, do pedido à entrega?'),
    ).toBeInTheDocument()
  })
})
