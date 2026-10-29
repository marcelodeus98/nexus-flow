import { Navigate } from 'react-router'
import { AuditLog } from '@/features/audit/audit-log'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { useCan, useProjectMe } from '../api'
import { useCurrentProject } from '../project-context'
import { ColumnsSettings } from './columns-settings'
import { GeneralSettings } from './general-settings'
import { MembersSettings } from './members-settings'
import { RulesSettings } from './rules-settings'
import { TagsSettings } from './tags-settings'

export function ProjectSettingsPage() {
  const project = useCurrentProject()
  const me = useProjectMe(project.key)
  const can = useCan(project.key)

  if (me.isPending) return null
  const canEdit = can('project:edit')
  const canConfigure = can('board:configure')
  if (!canEdit && !canConfigure) return <Navigate to={`/p/${project.key}`} replace />
  const readOnly = project.status === 'ARCHIVED'

  return (
    <Tabs defaultValue={canEdit ? 'general' : 'columns'} className="gap-4">
      <TabsList>
        {canEdit && <TabsTrigger value="general">Geral</TabsTrigger>}
        {canEdit && !readOnly && <TabsTrigger value="members">Membros</TabsTrigger>}
        {canConfigure && !readOnly && <TabsTrigger value="columns">Colunas</TabsTrigger>}
        {canConfigure && !readOnly && <TabsTrigger value="rules">Regras</TabsTrigger>}
        {canConfigure && !readOnly && <TabsTrigger value="tags">Tags</TabsTrigger>}
        {canEdit && <TabsTrigger value="audit">Auditoria</TabsTrigger>}
      </TabsList>
      <TabsContent value="general">
        <GeneralSettings key={project.id} project={project} />
      </TabsContent>
      <TabsContent value="members">
        <MembersSettings project={project} />
      </TabsContent>
      <TabsContent value="columns">
        <ColumnsSettings project={project} />
      </TabsContent>
      <TabsContent value="rules">
        <RulesSettings project={project} />
      </TabsContent>
      <TabsContent value="tags">
        <TagsSettings project={project} />
      </TabsContent>
      <TabsContent value="audit">
        <AuditLog source={`/projects/${project.id}/audit`} />
      </TabsContent>
    </Tabs>
  )
}
