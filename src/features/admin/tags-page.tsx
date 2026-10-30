import { Stack, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import type { Tag } from '@/features/board/api'
import { TagEditor } from '@/features/tags/tag-editor'
import { http } from '@/shared/api/http'

export function TagsPage() {
  const tags = useQuery({
    queryKey: ['tags', 'global'],
    queryFn: () => http<Tag[]>('/tags'),
  })

  return (
    <Stack gap="md" maw={576}>
      <Text size="sm" c="dimmed">
        Tags globais aparecem em todos os projetos. Cada projeto pode ter também as suas, nas
        configurações dele.
      </Text>
      <TagEditor
        endpoint="/tags"
        tags={tags.data ?? []}
        loaded={tags.isSuccess}
        emptyText="Ainda não há tags globais."
      />
    </Stack>
  )
}
