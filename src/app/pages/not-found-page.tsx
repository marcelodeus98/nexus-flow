import { Anchor, Stack, Title } from '@mantine/core'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <Stack gap="xs">
      <Title order={2}>Página não encontrada</Title>
      <Anchor component={Link} to="/">
        Voltar ao início
      </Anchor>
    </Stack>
  )
}
