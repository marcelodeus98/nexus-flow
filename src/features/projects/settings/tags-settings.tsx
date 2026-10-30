import { Badge, Group, Stack, Text } from '@mantine/core'
import { useTags } from '@/features/board/api'
import { TagEditor } from '@/features/tags/tag-editor'
import type { Project } from '../api'

// Project tags are edited here; global tags (admin) are listed read-only.
export function TagsSettings({ project }: { project: Project }) {
  const tags = useTags(project.id)
  const own = tags.data?.filter((tag) => tag.projectId) ?? []
  const global = tags.data?.filter((tag) => !tag.projectId) ?? []

  return (
    <Stack gap="xl" maw={576}>
      <TagEditor
        endpoint={`/projects/${project.id}/tags`}
        tags={own}
        loaded={tags.isSuccess}
        emptyText="Este projeto ainda não tem tags próprias."
      />
      {global.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Tags globais (definidas pela administração)
          </Text>
          <Group gap={6}>
            {global.map((tag) => (
              <Badge key={tag.id} color={tag.color} variant="light" tt="none">
                {tag.name}
              </Badge>
            ))}
          </Group>
        </Stack>
      )}
    </Stack>
  )
}
