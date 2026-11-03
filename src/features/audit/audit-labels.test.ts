import { describe, expect, it } from 'vitest'
import { actionLabel, actionLabels, describeActivity, describeMetadata } from './audit-labels'

// Every action the API records (grep "action:" in nexus-flow-api/src). A new
// action without a label fails here instead of showing English on screen.
const API_ACTIONS = [
  'attachment.added',
  'attachment.deleted',
  'auth.login',
  'auth.login_failed',
  'auth.password_reset',
  'board.created',
  'board.deleted',
  'board.qa_flow_enabled',
  'board.rules_changed',
  'board.updated',
  'card.approved',
  'card.bug_updated',
  'card.checklist_changed',
  'card.created',
  'card.deleted',
  'card.moved',
  'card.rejected',
  'card.test_detached',
  'card.test_run',
  'card.tests_attached',
  'card.updated',
  'column.created',
  'column.deleted',
  'column.moved',
  'column.updated',
  'comment.deleted',
  'department.created',
  'department.deleted',
  'department.updated',
  'project.archived',
  'project.created',
  'project.members_changed',
  'project.teams_changed',
  'project.unarchived',
  'project.updated',
  'sprint.cards_changed',
  'sprint.closed',
  'sprint.created',
  'sprint.deleted',
  'sprint.started',
  'sprint.updated',
  'tag.created',
  'tag.deleted',
  'tag.updated',
  'team.created',
  'team.deleted',
  'team.members_changed',
  'team.updated',
  'test_case.archived',
  'test_case.created',
  'test_case.updated',
  'time.auto_stopped',
  'time.deleted',
  'settings.mail_removed',
  'settings.mail_updated',
  'time.logged',
  'time.updated',
  'user.activated',
  'user.created',
  'user.deactivated',
  'user.updated',
]

describe('audit labels', () => {
  it('has a Portuguese label for every action the API records', () => {
    expect(API_ACTIONS.filter((action) => !actionLabels[action])).toEqual([])
  })

  it('never shows a raw code, even for an unknown action', () => {
    expect(actionLabel('card.something_new')).toBe('Card: alteração')
  })

  it('describes card history in Portuguese', () => {
    expect(describeActivity('time.logged', { seconds: 5400, source: 'MANUAL' })).toBe(
      'registrou 1h30 (manual)',
    )
    expect(describeActivity('card.test_run', { title: 'Login', status: 'FAILED', round: 2 })).toBe(
      'executou o caso de teste “Login”: falhou (rodada 2)',
    )
    expect(describeActivity('card.rejected', { reason: 'Erro 500' })).toBe(
      'reprovou o card (QA): “Erro 500”',
    )
  })

  it('turns metadata into readable pairs, without ids', () => {
    expect(
      describeMetadata({
        id: 'x',
        projectId: 'y',
        priority: { from: 'MEDIUM', to: 'URGENT' },
        methodology: 'SCRUM',
        qaFlow: true,
      }),
    ).toBe('prioridade: Média → Urgente · metodologia: Scrum · fluxo de QA: sim')
    // Due dates are days: no time zone shift to the evening before.
    expect(describeMetadata({ dueDate: { from: null, to: '2026-11-09T00:00:00.000Z' } })).toBe(
      'prazo: vazio → 09/11/2026',
    )
    expect(describeMetadata({ method: 'password' })).toBe('forma de acesso: e-mail e senha')
    expect(
      describeMetadata({
        reason: 'Erro 500',
        from: { columnId: 'a', name: 'Em teste' },
        to: { columnId: 'b', name: 'Em andamento' },
      }),
    ).toBe('de Em teste para Em andamento · motivo: Erro 500')
    expect(
      describeMetadata({
        added: ['01a18f6f-673e-751d-87c9-143f907c3c44'],
        removed: [],
        reason: null,
      }),
    ).toBe('adicionados: 1 · removidos: nenhum')
    expect(describeMetadata({ from: { name: 'A fazer' }, to: { name: 'Em teste' } })).toBe(
      'de A fazer para Em teste',
    )
  })
})
