import { Badge, ColorSwatch, Group, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import type { Tag } from '@/features/board/api'
import { http } from '@/shared/api/http'
import {
  ViewCardLink,
  ViewDrawer,
  ViewEmpty,
  ViewSection,
  type ViewCard,
} from '@/shared/ui/view-drawer'

type TagCards = {
  tag: { id: string; name: string; color: string; projectId: string | null }
  total: number
  cards: (ViewCard & { done: boolean })[]
}

// "Visualizar" for a tag: where it is used. `endpoint` is the tag list's
// (/projects/:id/tags or /tags): a project sees its own cards, an admin
// looking at a global tag sees every project's.
export function TagView({
  endpoint,
  tag,
  onClose,
}: {
  endpoint: string
  tag: Tag
  onClose: () => void
}) {
  const usage = useQuery({
    queryKey: ['tags', 'cards', endpoint, tag.id],
    queryFn: () => http<TagCards>(`${endpoint}/${tag.id}/cards`),
  })
  const u = usage.data
  const global = tag.projectId === null
  return (
    <ViewDrawer
      onClose={onClose}
      title={
        <Group gap="xs">
          <ColorSwatch color={tag.color} size={14} />
          {tag.name}
        </Group>
      }
      subtitle={global ? 'Tag global: aparece em todos os projetos' : 'Tag deste projeto'}
      badges={
        <Badge variant="light" color="gray">
          {tag.color.toUpperCase()}
        </Badge>
      }
      loading={usage.isPending}
      error={usage.error}
    >
      {u && (
        <ViewSection
          title={`Cards com a tag (${u.total})`}
          aside={
            u.total > u.cards.length && (
              <Text size="xs" c="dimmed">
                mostrando os {u.cards.length} mais recentes
              </Text>
            )
          }
        >
          {u.cards.length === 0 ? (
            <ViewEmpty>Nenhum card usa esta tag.</ViewEmpty>
          ) : (
            u.cards.map((card) => (
              <ViewCardLink key={card.id} card={card} note={card.done ? 'concluído' : undefined} />
            ))
          )}
        </ViewSection>
      )}
    </ViewDrawer>
  )
}
