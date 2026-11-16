import { Badge, Button, Drawer, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { IconPencil } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '@/shared/api/errors'
import './view-drawer.css'

// "Visualizar": the read-only side panel every list opens for one item, with
// "Editar" inside it for whoever may change the item.
export function ViewDrawer({
  opened = true,
  onClose,
  title,
  subtitle,
  badges,
  onEdit,
  editLabel = 'Editar',
  loading,
  error,
  children,
}: {
  opened?: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  badges?: ReactNode
  onEdit?: () => void
  editLabel?: string
  loading?: boolean
  error?: unknown
  children?: ReactNode
}) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      title={
        <Stack gap={2}>
          <Title order={3}>{title}</Title>
          {subtitle && (
            <Text size="sm" c="dimmed">
              {subtitle}
            </Text>
          )}
        </Stack>
      }
    >
      <Stack gap="lg">
        {(badges || onEdit) && (
          <Group justify="space-between" gap="xs">
            <Group gap={6}>{badges}</Group>
            {onEdit && (
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPencil size={14} />}
                onClick={onEdit}
              >
                {editLabel}
              </Button>
            )}
          </Group>
        )}
        {loading && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">
              Carregando…
            </Text>
          </Group>
        )}
        {error != null && (
          <Text size="sm" c="red">
            {apiErrorMessage(error)}
          </Text>
        )}
        {children}
      </Stack>
    </Drawer>
  )
}

export function ViewSection({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="view-drawer__section">
      <Group justify="space-between" mb={6}>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" className="view-drawer__section-title">
          {title}
        </Text>
        {aside}
      </Group>
      {children}
    </section>
  )
}

// Label/value pairs in two columns.
export function ViewFields({ fields }: { fields: [string, ReactNode][] }) {
  return (
    <dl className="view-drawer__fields">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

// Big numbers side by side.
export function ViewFigures({
  figures,
}: {
  figures: { label: string; value: ReactNode; alert?: boolean }[]
}) {
  return (
    <div className="view-drawer__figures">
      {figures.map((figure) => (
        <div key={figure.label}>
          <strong className={figure.alert ? 'view-drawer__alert' : undefined}>
            {figure.value}
          </strong>
          <span>{figure.label}</span>
        </div>
      ))}
    </div>
  )
}

export type ViewCard = {
  id: string
  key: string
  number: number
  title: string
  type: 'TASK' | 'BUG'
  project: { key: string; name: string }
  column: string
}

// A card in a list, opening the card over its board.
export function ViewCardLink({ card, note }: { card: ViewCard; note?: ReactNode }) {
  return (
    <Link to={`/p/${card.project.key}/c/${card.number}`} className="view-drawer__card">
      <span className="view-drawer__card-key">{card.key}</span>
      <span className="view-drawer__card-body">
        <span className="view-drawer__card-title">
          {card.type === 'BUG' && (
            <Badge size="xs" color="red" variant="light" mr={4}>
              Bug
            </Badge>
          )}
          {card.title}
        </span>
        <span className="view-drawer__card-note">
          {card.column} · {card.project.name}
          {note && <> · {note}</>}
        </span>
      </span>
    </Link>
  )
}

export function ViewEmpty({ children }: { children: ReactNode }) {
  return (
    <Text size="sm" c="dimmed">
      {children}
    </Text>
  )
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
