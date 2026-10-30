import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AuditLog } from '@/features/audit/audit-log'
import { useBoards } from '@/features/board/api'
import { Tabs } from '@mantine/core'
import { useCan, useProjectMe } from '../api'
import { useCurrentProject } from '../project-context'
import { BoardPicker, BoardsSettings } from './boards-settings'
import { ColumnsSettings } from './columns-settings'
import { GeneralSettings } from './general-settings'
import { MembersSettings } from './members-settings'
import { RulesSettings } from './rules-settings'
import { TagsSettings } from './tags-settings'

export function ProjectSettingsPage() {
  const project = useCurrentProject()
  const me = useProjectMe(project.key)
  const can = useCan(project.key)
  const boards = useBoards(project.id)
  const [picked, setPicked] = useState<string>()
  // The picked board, unless it was deleted meanwhile; else the default one.
  const boardId =
    (boards.data?.some((board) => board.id === picked) ? picked : project.defaultBoardId) ?? ''

  if (me.isPending) return null
  const canEdit = can('project:edit')
  const canConfigure = can('board:configure')
  if (!canEdit && !canConfigure) return <Navigate to={`/p/${project.key}`} replace />
  const readOnly = project.status === 'ARCHIVED'

  return (
    <Tabs defaultValue={canEdit ? 'general' : 'boards'} keepMounted={false}>
      <Tabs.List mb="lg">
        {canEdit && <Tabs.Tab value="general">Geral</Tabs.Tab>}
        {canEdit && !readOnly && <Tabs.Tab value="members">Membros</Tabs.Tab>}
        {canConfigure && !readOnly && <Tabs.Tab value="boards">Boards</Tabs.Tab>}
        {canConfigure && !readOnly && <Tabs.Tab value="columns">Colunas</Tabs.Tab>}
        {canConfigure && !readOnly && <Tabs.Tab value="rules">Regras</Tabs.Tab>}
        {canConfigure && !readOnly && <Tabs.Tab value="tags">Tags</Tabs.Tab>}
        {canEdit && <Tabs.Tab value="audit">Auditoria</Tabs.Tab>}
      </Tabs.List>
      <Tabs.Panel value="general">
        <GeneralSettings key={project.id} project={project} />
      </Tabs.Panel>
      <Tabs.Panel value="members">
        <MembersSettings project={project} />
      </Tabs.Panel>
      <Tabs.Panel value="boards">
        <BoardsSettings project={project} />
      </Tabs.Panel>
      <Tabs.Panel value="columns">
        <BoardPicker boards={boards.data ?? []} value={boardId} onChange={setPicked} />
        {boardId && <ColumnsSettings key={boardId} project={project} boardId={boardId} />}
      </Tabs.Panel>
      <Tabs.Panel value="rules">
        <BoardPicker boards={boards.data ?? []} value={boardId} onChange={setPicked} />
        {boardId && <RulesSettings key={boardId} project={project} boardId={boardId} />}
      </Tabs.Panel>
      <Tabs.Panel value="tags">
        <TagsSettings project={project} />
      </Tabs.Panel>
      <Tabs.Panel value="audit">
        <AuditLog source={`/projects/${project.id}/audit`} />
      </Tabs.Panel>
    </Tabs>
  )
}
