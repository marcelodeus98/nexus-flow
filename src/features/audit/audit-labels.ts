// Audit actions in Portuguese, for the audit log and the card history. The
// API records technical codes ("card.moved") with metadata in English keys;
// nothing of that should reach the screen untranslated.

type Meta = Record<string, unknown>

// What happened, as a short title (audit log "Ação" column).
export const actionLabels: Record<string, string> = {
  'auth.login': 'Login',
  'auth.login_failed': 'Login recusado',
  'auth.password_reset': 'Senha redefinida',
  'user.created': 'Usuário cadastrado',
  'user.updated': 'Usuário alterado',
  'user.activated': 'Usuário reativado',
  'user.deactivated': 'Usuário desativado',
  'department.created': 'Departamento criado',
  'department.updated': 'Departamento alterado',
  'department.deleted': 'Departamento excluído',
  'team.created': 'Time criado',
  'team.updated': 'Time alterado',
  'team.deleted': 'Time excluído',
  'team.members_changed': 'Membros do time alterados',
  'project.created': 'Projeto criado',
  'project.updated': 'Projeto alterado',
  'project.archived': 'Projeto arquivado',
  'project.unarchived': 'Projeto desarquivado',
  'project.members_changed': 'Membros do projeto alterados',
  'project.teams_changed': 'Times do projeto alterados',
  'board.created': 'Board criado',
  'board.updated': 'Board alterado',
  'board.deleted': 'Board excluído',
  'board.rules_changed': 'Regras do board alteradas',
  'board.qa_flow_enabled': 'Fluxo de QA ativado',
  'column.created': 'Coluna criada',
  'column.updated': 'Coluna alterada',
  'column.moved': 'Coluna reordenada',
  'column.deleted': 'Coluna excluída',
  'tag.created': 'Tag criada',
  'tag.updated': 'Tag alterada',
  'tag.deleted': 'Tag excluída',
  'card.created': 'Card criado',
  'card.updated': 'Card alterado',
  'card.moved': 'Card movido',
  'card.deleted': 'Card excluído',
  'card.checklist_changed': 'Checklist alterado',
  'card.approved': 'Card aprovado pelo QA',
  'card.rejected': 'Card reprovado pelo QA',
  'card.bug_updated': 'Detalhes do bug alterados',
  'card.tests_attached': 'Casos de teste anexados',
  'card.test_detached': 'Caso de teste removido do card',
  'card.test_run': 'Caso de teste executado',
  'comment.deleted': 'Comentário excluído',
  'attachment.added': 'Anexo adicionado',
  'attachment.deleted': 'Anexo excluído',
  'time.logged': 'Tempo registrado',
  'time.updated': 'Lançamento de tempo alterado',
  'time.deleted': 'Lançamento de tempo excluído',
  'time.auto_stopped': 'Timer parado automaticamente',
  'sprint.created': 'Sprint criada',
  'sprint.updated': 'Sprint alterada',
  'sprint.deleted': 'Sprint excluída',
  'sprint.started': 'Sprint iniciada',
  'sprint.closed': 'Sprint encerrada',
  'sprint.cards_changed': 'Cards da sprint alterados',
  'test_case.created': 'Caso de teste criado',
  'test_case.updated': 'Caso de teste alterado',
  'test_case.archived': 'Caso de teste arquivado',
  'settings.mail_updated': 'Configuração de e-mail (SMTP) alterada',
  'settings.mail_removed': 'Configuração de e-mail (SMTP) removida',
}

// A code without a label still reads as Portuguese: the entity it is about.
const entityLabels: Record<string, string> = {
  auth: 'Acesso',
  user: 'Usuário',
  department: 'Departamento',
  team: 'Time',
  project: 'Projeto',
  board: 'Board',
  column: 'Coluna',
  tag: 'Tag',
  card: 'Card',
  comment: 'Comentário',
  attachment: 'Anexo',
  time: 'Tempo',
  sprint: 'Sprint',
  test_case: 'Caso de teste',
  settings: 'Configurações',
}

export function actionLabel(action: string): string {
  return actionLabels[action] ?? `${entityLabels[action.split('.')[0]] ?? 'Registro'}: alteração`
}

// Field names that show up in metadata.
const fieldLabels: Record<string, string> = {
  title: 'título',
  name: 'nome',
  description: 'descrição',
  priority: 'prioridade',
  storyPoints: 'story points',
  estimateMinutes: 'estimativa',
  dueDate: 'prazo',
  parentId: 'card pai',
  assigneeIds: 'responsáveis',
  tagIds: 'tags',
  departments: 'departamentos',
  key: 'chave',
  methodology: 'metodologia',
  defaultEstimateView: 'estimativa exibida',
  qaFlow: 'fluxo de QA',
  email: 'e-mail',
  jobTitle: 'cargo',
  globalRole: 'papel',
  departmentId: 'departamento',
  withPassword: 'com senha inicial',
  color: 'cor',
  category: 'categoria',
  wipLimit: 'limite de WIP',
  isDefault: 'board padrão',
  goal: 'objetivo',
  startDate: 'início',
  endDate: 'fim',
  severity: 'severidade',
  environment: 'ambiente',
  steps: 'passos',
  expected: 'resultado esperado',
  actual: 'resultado obtido',
  foundInCardId: 'encontrado no card',
  reason: 'motivo',
  number: 'número',
  count: 'quantidade',
  cards: 'cards',
  fileName: 'arquivo',
  size: 'tamanho',
  seconds: 'duração',
  source: 'origem',
  note: 'nota',
  status: 'resultado',
  round: 'rodada',
  done: 'concluídos',
  total: 'total',
  members: 'membros',
  teams: 'times',
  testingCreated: 'coluna "Em teste" criada',
  ruleCreated: 'regra de aprovação criada',
  archived: 'arquivado',
  isActive: 'ativo',
  type: 'tipo',
  kind: 'tipo',
  ip: 'IP',
  method: 'forma de acesso',
  added: 'adicionados',
  removed: 'removidos',
  role: 'papel',
  from: 'antes',
  to: 'depois',
  startedAt: 'início',
  completed: 'concluídos',
  unfinished: 'não concluídos',
  carriedOver: 'passaram adiante',
  host: 'servidor',
  port: 'porta',
  secure: 'TLS direto',
  username: 'usuário',
  fromAddress: 'remetente',
  password: 'senha',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i

// Calendar days stored at UTC midnight: shown as the day, never converted to
// local time (that would show the evening before).
const DAY_FIELDS = new Set(['dueDate', 'startDate', 'endDate'])

// Enum values that show up in metadata.
const valueLabels: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
  CRITICAL: 'Crítica',
  KANBAN: 'Kanban',
  SCRUM: 'Scrum',
  HYBRID: 'Híbrido',
  POINTS: 'Story points',
  HOURS: 'Horas',
  ADMIN: 'Administrador',
  USER: 'Usuário',
  MANAGER: 'Gestor',
  PRODUCT_OWNER: 'Product Owner',
  DEVELOPER: 'Desenvolvedor',
  QA: 'QA',
  PROCESS: 'Processos',
  VIEWER: 'Visualizador',
  BACKLOG: 'Backlog',
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  REVIEW: 'Revisão',
  TESTING: 'Em teste',
  DONE: 'Concluído',
  BLOCKED: 'Bloqueado',
  TASK: 'Tarefa',
  BUG: 'Bug',
  PASSED: 'Passou',
  FAILED: 'Falhou',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  MANUAL: 'manual',
  TIMER: 'timer',
  GENERAL: 'Geral',
  password: 'e-mail e senha',
  ORIGIN: 'Origem',
  TARGET: 'Destino',
  INVOLVED: 'Envolvido',
  changed: 'alterada',
  unchanged: 'mantida',
  removed: 'removida',
}

const hours = (seconds: number) => {
  const minutes = Math.round(seconds / 60)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h === 0 ? `${m} min` : m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

const isId = (key: string) => key === 'id' || /Ids?$/.test(key) || key === 'authorId'

// One value in Portuguese: enums, booleans, dates, durations and lists.
function value(key: string, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return 'vazio'
  if (typeof raw === 'boolean') return raw ? 'sim' : 'não'
  if (key === 'seconds' && typeof raw === 'number') return hours(raw)
  if (key === 'estimateMinutes' && typeof raw === 'number') return hours(raw * 60)
  if (key === 'size' && typeof raw === 'number') {
    return raw < 1024 * 1024
      ? `${Math.round(raw / 1024)} KB`
      : `${(raw / 1024 / 1024).toFixed(1)} MB`
  }
  if (typeof raw === 'string') {
    if (valueLabels[raw]) return valueLabels[raw]
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.length > 10 && !DAY_FIELDS.has(key)
        ? new Date(raw).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}`
    }
    return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) return 'nenhum'
    // Internal ids mean nothing to people: say how many.
    if (raw.every((item) => typeof item === 'string' && UUID.test(item))) return String(raw.length)
    if (raw.every((item) => typeof item === 'string'))
      return raw.map((item) => value(key, item)).join(', ')
    return raw.length === 1 ? '1 item' : `${raw.length} itens`
  }
  if (typeof raw === 'number') return raw.toLocaleString('pt-BR')
  return '…'
}

const name = (side: unknown) => (side as { name?: string } | undefined)?.name

// The metadata as "campo: valor" pairs, ids left out (they mean nothing to
// people). Changes recorded as { from, to } read "de X para Y".
export function describeMetadata(meta: Meta | null): string {
  if (!meta) return ''
  const parts: string[] = []
  // A move recorded as from/to columns: "de X para Y".
  const moved = name(meta.from) && name(meta.to)
  if (moved) parts.push(`de ${name(meta.from)} para ${name(meta.to)}`)
  for (const [key, raw] of Object.entries(meta)) {
    if (isId(key) || raw === undefined || raw === null || raw === '') continue
    if (moved && (key === 'from' || key === 'to')) continue
    const label = fieldLabels[key] ?? key
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const change = raw as { from?: unknown; to?: unknown }
      if ('from' in change || 'to' in change) {
        parts.push(`${label}: ${value(key, change.from)} → ${value(key, change.to)}`)
      } else {
        const inner = describeMetadata(raw as Meta)
        if (inner) parts.push(`${label}: ${inner}`)
      }
      continue
    }
    parts.push(`${label}: ${value(key, raw)}`)
  }
  return parts.join(' · ')
}

// The card history: what someone did, as a phrase after their name.
export function describeActivity(action: string, meta: Meta | null): string {
  const m = meta ?? {}
  switch (action) {
    case 'card.created':
      return m.type === 'BUG' ? 'reportou o bug' : 'criou o card'
    case 'card.moved':
      return `moveu de ${name(m.from) ?? '?'} para ${name(m.to) ?? '?'}`
    case 'card.updated': {
      const fields = Object.keys(m).map((field) => fieldLabels[field] ?? field)
      return fields.length ? `alterou ${fields.join(', ')}` : 'editou o card'
    }
    case 'card.deleted':
      return 'excluiu o card'
    case 'card.checklist_changed':
      return typeof m.total === 'number'
        ? `alterou o checklist (${m.done}/${m.total} concluídos)`
        : 'alterou o checklist'
    case 'card.approved':
      return 'aprovou o card (QA)'
    case 'card.rejected':
      return `reprovou o card (QA)${m.reason ? `: “${String(m.reason)}”` : ''}`
    case 'card.bug_updated':
      return `alterou os detalhes do bug (${Object.keys(m)
        .filter((key) => !isId(key))
        .map((key) => fieldLabels[key] ?? key)
        .join(', ')})`
    case 'card.tests_attached': {
      const count = Array.isArray(m.testCaseIds) ? m.testCaseIds.length : 0
      return count === 1 ? 'anexou um caso de teste' : `anexou ${count} casos de teste`
    }
    case 'card.test_detached':
      return 'removeu um caso de teste'
    case 'card.test_run':
      return `executou o caso de teste “${String(m.title ?? '')}”: ${value('status', m.status).toLowerCase()}${m.round ? ` (rodada ${String(m.round)})` : ''}`
    case 'comment.deleted':
      return 'excluiu um comentário'
    case 'attachment.added':
      return `anexou ${String(m.fileName ?? 'um arquivo')}`
    case 'attachment.deleted':
      return `excluiu o anexo ${String(m.fileName ?? '')}`.trim()
    case 'time.logged':
      return `registrou ${typeof m.seconds === 'number' ? hours(m.seconds) : 'tempo'}${m.source === 'MANUAL' ? ' (manual)' : ''}`
    case 'time.updated':
      return 'alterou um lançamento de tempo'
    case 'time.deleted':
      return 'excluiu um lançamento de tempo'
    case 'time.auto_stopped':
      return 'teve o timer parado automaticamente (ligado por muito tempo)'
    default:
      return actionLabel(action).toLowerCase()
  }
}
