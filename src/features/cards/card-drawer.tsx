import {
  ActionIcon,
  Box,
  Button,
  Drawer,
  Group,
  Menu,
  MultiSelect,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconBell, IconBellOff, IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDepartments } from '@/features/admin/api'
import { describeActivity } from '@/features/audit/audit-labels'
import {
  boardKeys,
  priorityLabels,
  useBoard,
  useBoards,
  useMoveCard,
  useTags,
  type Board,
  type CardDepartmentRole,
  type CardPriority,
} from '@/features/board/api'
import { moveErrorMessage } from '@/features/board/move-errors'
import { useCan, useProjectMe, useProjectMembers } from '@/features/projects/api'
import { useCurrentProject } from '@/features/projects/project-context'
import { apiErrorMessage } from '@/shared/api/errors'
import { ApiError, http } from '@/shared/api/http'
import { useSessionState } from '@/shared/auth/session-store'
import { confirmDanger } from '@/shared/notify/confirm'
import { toast } from '@/shared/notify/toast'
import {
  useCardActivity,
  useCardByNumber,
  useDeleteCard,
  useSetWatching,
  useUpdateCard,
  type CardDetail,
  type CardPatch,
} from './api'
import { DescriptionEditor } from './description-editor'
import { Section } from './sections/section'
import { SubtasksSection } from './sections/subtasks-section'
import { AttachmentsSection } from './sections/attachments-section'
import { ChecklistSection } from './sections/checklist-section'
import { CommentsSection } from './sections/comments-section'
import { BugSection, BugsFoundSection } from './sections/bug-sections'
import { ReviewSection } from './sections/review-section'
import { TestsSection } from './sections/tests-section'
import { SprintField } from './sections/sprint-field'
import { TimeSection } from './sections/time-section'
import './card-drawer.css'

const departmentRoleLabels: Record<CardDepartmentRole, string> = {
  ORIGIN: 'Origem',
  TARGET: 'Destino',
  INVOLVED: 'Envolvido',
}

const departmentRoleOptions = Object.entries(departmentRoleLabels).map(([value, label]) => ({
  value,
  label,
}))
const priorityOptions = Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))

// /p/:projectKey/c/:cardNumber — the card in a side panel over the board, so
// the link can be shared and the board stays in place behind it.
export function CardDrawer() {
  const project = useCurrentProject()
  const { cardNumber, boardId } = useParams()
  const navigate = useNavigate()
  const card = useCardByNumber(project.id, Number(cardNumber))
  // Back to the board it was opened over.
  const close = () =>
    void navigate(boardId ? `/p/${project.key}/b/${boardId}` : `/p/${project.key}`)

  return (
    <Drawer
      opened
      onClose={close}
      position="right"
      size="xl"
      withCloseButton={false}
      padding={0}
      title={null}
      aria-label="Card"
    >
      {card.isPending && (
        <Text p="xl" c="dimmed">
          Carregando…
        </Text>
      )}
      {card.isError && (
        <Stack p="xl" gap="xs">
          <Title order={4}>
            {card.error instanceof ApiError && card.error.status === 404
              ? 'Card não encontrado'
              : 'Não foi possível abrir o card'}
          </Title>
          <Text size="sm" c="dimmed">
            {apiErrorMessage(card.error)}
          </Text>
        </Stack>
      )}
      {card.data && <CardDetailView card={card.data} onClose={close} />}
    </Drawer>
  )
}

function CardDetailView({ card, onClose }: { card: CardDetail; onClose: () => void }) {
  const project = useCurrentProject()
  const can = useCan(project.key)
  const queryClient = useQueryClient()
  const board = useBoard(project.id, card.boardId)
  const boards = useBoards(project.id)
  const tags = useTags(project.id)
  const members = useProjectMembers(project.id)
  const departments = useDepartments()
  const session = useSessionState()
  const userId = session.status === 'authenticated' ? session.session.user.id : ''
  const update = useUpdateCard(project.id, card)
  const remove = useDeleteCard(project.id)
  const watch = useSetWatching(project.id, card)
  const moveCard = useMoveCard(project.id, boardKeys.board(project.id, card.boardId), (error) =>
    toast.error(moveErrorMessage(error)),
  )

  // To another board: the end of its first column (its rules still apply).
  async function moveToBoard(boardId: string) {
    try {
      const target = await queryClient.fetchQuery({
        queryKey: boardKeys.board(project.id, boardId),
        queryFn: () => http<Board>(`/boards/${boardId}`),
      })
      const first = target.columns[0]
      if (first) moveCard({ cardId: card.id, columnId: first.id })
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  const readOnly = project.status === 'ARCHIVED'
  const editable = !readOnly && can('card:edit')
  const movable = !readOnly && can('card:move')
  const watching = card.watcherIds.includes(userId)
  const me = useProjectMe(project.key)
  const isModerator = Boolean(me.data?.isAdmin || me.data?.role === 'MANAGER')
  const usesSprints = project.methodology !== 'KANBAN'
  const canPlan = !readOnly && can('backlog:prioritize')

  function save(patch: CardPatch) {
    update.mutate(patch, {
      onError: (error) =>
        toast.error(
          apiErrorMessage(error, {
            412: 'Outra pessoa alterou este card. Carregamos a versão atual; refaça a alteração.',
            400: 'Não deu para salvar. Um card não pode ser pai de um card acima dele (ex.: da própria subtarefa).',
          }),
        ),
    })
  }

  const memberList = members.data?.members ?? []
  const columns = board.data?.columns ?? []

  function confirmDelete() {
    confirmDanger({
      title: `Excluir ${project.key}-${card.number}?`,
      message: 'O card sai do board. O número e o histórico ficam guardados.',
      onConfirm: () =>
        remove.mutate(card.id, {
          onSuccess: () => {
            toast.success('Card excluído.')
            onClose()
          },
          onError: (error) => toast.error(apiErrorMessage(error)),
        }),
    })
  }

  return (
    <Stack gap="xl" p="xl">
      <Group align="flex-start" gap="xs" wrap="nowrap">
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" c="dimmed" ff="monospace">
            {project.key}-{card.number}
            {card.parent && (
              <>
                {' · filho de '}
                <Link to={`/p/${project.key}/c/${card.parent.number}`} className="text-link">
                  {project.key}-{card.parent.number}
                </Link>
              </>
            )}
          </Text>
          <TitleField
            key={card.version}
            value={card.title}
            editable={editable}
            onSave={(title) => save({ title })}
          />
        </Stack>
        <ActionIcon variant="subtle" color="gray" aria-label="Fechar" onClick={onClose}>
          <IconX size={18} />
        </ActionIcon>
      </Group>

      <dl className="card-drawer__fields">
        {(boards.data?.length ?? 0) > 1 && (
          <Row label="Board">
            <Select
              size="xs"
              aria-label="Board"
              value={card.boardId}
              disabled={!movable}
              onChange={(boardId) => boardId && void moveToBoard(boardId)}
              allowDeselect={false}
              data={(boards.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
            />
          </Row>
        )}
        <Row label="Coluna">
          <Select
            size="xs"
            aria-label="Coluna"
            value={card.columnId}
            disabled={!movable}
            onChange={(columnId) => columnId && moveCard({ cardId: card.id, columnId })}
            allowDeselect={false}
            data={columns.map((column) => ({ value: column.id, label: column.name }))}
          />
        </Row>
        <Row label="Prioridade">
          <Select
            size="xs"
            aria-label="Prioridade"
            value={card.priority}
            disabled={!editable}
            onChange={(priority) => priority && save({ priority: priority as CardPriority })}
            allowDeselect={false}
            data={priorityOptions}
          />
        </Row>
        <Row label="Story points">
          <NumberField
            key={`sp-${card.version}`}
            label="Story points"
            value={card.storyPoints}
            step={0.5}
            editable={editable}
            onSave={(storyPoints) => save({ storyPoints })}
          />
        </Row>
        <Row label="Estimativa (h)">
          <NumberField
            key={`h-${card.version}`}
            label="Estimativa em horas"
            value={card.estimateMinutes === null ? null : card.estimateMinutes / 60}
            step={0.25}
            editable={editable}
            onSave={(hours) =>
              save({ estimateMinutes: hours === null ? null : Math.round(hours * 60) })
            }
          />
        </Row>
        <Row label="Prazo">
          <TextInput
            key={`due-${card.version}`}
            size="xs"
            type="date"
            aria-label="Prazo"
            disabled={!editable}
            defaultValue={card.dueDate?.slice(0, 10) ?? ''}
            onBlur={(e) => {
              const value = e.target.value || null
              if (value !== (card.dueDate?.slice(0, 10) ?? null)) save({ dueDate: value })
            }}
          />
        </Row>
        <Row label="Responsáveis">
          <MultiPicker
            label="Responsáveis"
            disabled={!editable}
            options={memberList.map((m) => ({ id: m.user.id, label: m.user.name }))}
            selected={card.assigneeIds}
            onChange={(assigneeIds) => save({ assigneeIds })}
          />
        </Row>
        <Row label="Tags">
          <MultiPicker
            label="Tags"
            disabled={!editable}
            options={(tags.data ?? []).map((tag) => ({ id: tag.id, label: tag.name }))}
            selected={card.tagIds}
            onChange={(tagIds) => save({ tagIds })}
          />
        </Row>
        <Row label="Departamentos">
          <DepartmentsField
            value={card.departments}
            options={departments.data ?? []}
            editable={editable}
            onChange={(value) => save({ departments: value })}
          />
        </Row>
        <Row label="Card pai">
          <Select
            size="xs"
            aria-label="Card pai"
            placeholder="Nenhum (card principal)"
            searchable
            clearable
            disabled={!editable}
            value={card.parentId}
            onChange={(parentId) => {
              if (parentId !== card.parentId) save({ parentId })
            }}
            nothingFoundMessage="Nenhum card encontrado neste board"
            data={(board.data?.cards ?? [])
              .filter((other) => other.id !== card.id)
              .map((other) => ({
                value: other.id,
                label: `${project.key}-${other.number} ${other.title}`,
              }))}
          />
        </Row>
        {usesSprints && (
          <Row label="Sprint">
            <SprintField projectId={project.id} card={card} editable={canPlan} />
          </Row>
        )}
      </dl>

      <Section title="Descrição">
        <DescriptionEditor
          key={card.version}
          value={card.description}
          editable={editable}
          saving={update.isPending}
          onSave={(description) => save({ description })}
        />
      </Section>

      <SubtasksSection
        projectId={project.id}
        projectKey={project.key}
        card={card}
        columns={columns}
        canCreate={!readOnly && can('card:create')}
      />

      <BugSection projectId={project.id} projectKey={project.key} card={card} editable={editable} />

      <ReviewSection
        projectId={project.id}
        card={card}
        canValidate={!readOnly && can('card:validate')}
      />

      <TestsSection projectId={project.id} card={card} canRun={!readOnly && can('card:validate')} />

      <BugsFoundSection
        projectKey={project.key}
        card={card}
        canReport={!readOnly && can('card:create')}
      />

      <ChecklistSection
        projectId={project.id}
        card={card}
        editable={editable}
        validatable={editable && can('card:validate')}
      />

      <TimeSection card={card} canLog={!readOnly && can('time:log')} userId={userId} />

      <AttachmentsSection
        cardId={card.id}
        userId={userId}
        canEdit={editable}
        canModerate={isModerator}
      />

      <CommentsSection
        cardId={card.id}
        members={memberList.map((m) => ({ id: m.user.id, label: m.user.name }))}
        userId={userId}
        canComment={!readOnly && can('comment:create')}
        canModerate={isModerator}
      />

      <Activity cardId={card.id} />

      <Group gap="sm" pt="md" className="card-drawer__footer">
        <Button
          variant="default"
          size="xs"
          leftSection={watching ? <IconBellOff size={14} /> : <IconBell size={14} />}
          loading={watch.isPending}
          onClick={() => watch.mutate(!watching)}
        >
          {watching ? 'Deixar de seguir' : 'Seguir'}
        </Button>
        <Text size="xs" c="dimmed">
          Criado {card.createdBy && `por ${card.createdBy.name} `}em{' '}
          {new Date(card.createdAt).toLocaleDateString('pt-BR')}
        </Text>
        {editable && (
          <Button
            ml="auto"
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={confirmDelete}
          >
            Excluir
          </Button>
        )}
      </Group>
    </Stack>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="card-drawer__label">{label}</dt>
      <dd className="card-drawer__value">{children}</dd>
    </>
  )
}

function TitleField({
  value,
  editable,
  onSave,
  ...props
}: {
  value: string
  editable: boolean
  onSave: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    else setDraft(value)
  }
  if (!editable) {
    return (
      <h2 className="card-drawer__title" {...props}>
        {value}
      </h2>
    )
  }
  return (
    <h2 className="card-drawer__title" {...props}>
      <textarea
        aria-label="Título"
        value={draft}
        rows={1}
        maxLength={200}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') setDraft(value)
        }}
        className="card-drawer__title-input"
      />
    </h2>
  )
}

function NumberField({
  label,
  value,
  step,
  editable,
  onSave,
}: {
  label: string
  value: number | null
  step: number
  editable: boolean
  onSave: (value: number | null) => void
}) {
  return (
    <NumberInput
      size="xs"
      aria-label={label}
      min={0}
      step={step}
      decimalSeparator=","
      disabled={!editable}
      defaultValue={value ?? ''}
      placeholder="—"
      onBlur={(e) => {
        const text = e.target.value.replace(',', '.')
        const next = text === '' ? null : Number(text)
        if (next !== value && (next === null || Number.isFinite(next))) onSave(next)
      }}
    />
  )
}

// Changes are collected while the list is open and saved once it closes.
function MultiPicker({
  label,
  options,
  selected,
  disabled,
  onChange,
}: {
  label: string
  options: { id: string; label: string }[]
  selected: string[]
  disabled: boolean
  onChange: (ids: string[]) => void
}) {
  const [draft, setDraft] = useState<string[] | null>(null)
  const current = draft ?? selected

  function commit(next: string[]) {
    if ([...next].sort().join() !== [...selected].sort().join()) onChange(next)
    setDraft(null)
  }

  return (
    <MultiSelect
      size="xs"
      aria-label={label}
      placeholder={current.length ? undefined : 'Nenhum'}
      disabled={disabled}
      searchable
      nothingFoundMessage={`Nada para escolher em ${label.toLowerCase()}`}
      value={current}
      data={options.map((option) => ({ value: option.id, label: option.label }))}
      onChange={(ids) => (draft === null ? commit(ids) : setDraft(ids))}
      onDropdownOpen={() => setDraft(selected)}
      onDropdownClose={() => draft !== null && commit(draft)}
    />
  )
}

function DepartmentsField({
  value,
  options,
  editable,
  onChange,
}: {
  value: CardDetail['departments']
  options: { id: string; name: string; color: string }[]
  editable: boolean
  onChange: (value: CardDetail['departments']) => void
}) {
  const byId = new Map(options.map((d) => [d.id, d]))
  const available = options.filter((d) => !value.some((v) => v.departmentId === d.id))

  return (
    <Stack gap={6}>
      {value.map((entry) => {
        const department = byId.get(entry.departmentId)
        return (
          <Group key={entry.departmentId} gap="xs" wrap="nowrap">
            <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Box
                w={10}
                h={10}
                style={{ borderRadius: '50%', flexShrink: 0, background: department?.color }}
              />
              <Text size="sm" truncate>
                {department?.name ?? '—'}
              </Text>
            </Group>
            <Select
              size="xs"
              w={120}
              aria-label={`Papel de ${department?.name}`}
              value={entry.role}
              disabled={!editable}
              onChange={(role) =>
                role &&
                onChange(
                  value.map((v) =>
                    v.departmentId === entry.departmentId
                      ? { ...v, role: role as CardDepartmentRole }
                      : v,
                  ),
                )
              }
              allowDeselect={false}
              data={departmentRoleOptions}
            />
            {editable && (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={`Remover ${department?.name}`}
                onClick={() => onChange(value.filter((v) => v.departmentId !== entry.departmentId))}
              >
                <IconX size={14} />
              </ActionIcon>
            )}
          </Group>
        )
      })}
      {editable && available.length > 0 && (
        <Menu position="bottom-start">
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              w="fit-content"
              leftSection={<IconPlus size={14} />}
            >
              Adicionar departamento
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {available.map((department) => (
              <Menu.Item
                key={department.id}
                onClick={() =>
                  onChange([
                    ...value,
                    {
                      departmentId: department.id,
                      role: value.length === 0 ? 'ORIGIN' : 'INVOLVED',
                    },
                  ])
                }
              >
                {department.name}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
      {!editable && value.length === 0 && (
        <Text size="sm" c="dimmed">
          Nenhum
        </Text>
      )}
    </Stack>
  )
}

function Activity({ cardId }: { cardId: string }) {
  const activity = useCardActivity(cardId)
  return (
    <Section
      title="Histórico"
      aside={
        activity.data && activity.data.length > 0 ? (
          <Text size="sm" c="dimmed">
            {activity.data.length} {activity.data.length === 1 ? 'registro' : 'registros'}
          </Text>
        ) : undefined
      }
    >
      {/* Long histories scroll inside the section instead of stretching the drawer. */}
      <ScrollArea.Autosize mah={280} type="auto" offsetScrollbars className="card-drawer__scroll">
        <Stack gap={6} component="ol" className="card-drawer__activity">
          {activity.data?.map((entry) => (
            <Group key={entry.id} component="li" gap="xs" wrap="nowrap" align="flex-start">
              <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                {new Date(entry.createdAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text size="sm">
                <Text span fw={600}>
                  {entry.actor?.name ?? 'Sistema'}
                </Text>{' '}
                {describeActivity(entry.action, entry.metadata)}
              </Text>
            </Group>
          ))}
        </Stack>
      </ScrollArea.Autosize>
    </Section>
  )
}
