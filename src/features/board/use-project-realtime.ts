import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { cardKeys } from '@/features/cards/api'
import { projectKeys } from '@/features/projects/api'
import { getSocket } from '@/shared/realtime/socket'
import { boardKeys, removeCard, upsertCard, type CardSummary } from './api'

// While a project is open: join its room and fold the server's events into
// the query cache. After a reconnect the room is joined again and the board
// refetched, since events may have been missed while offline.
export function useProjectRealtime(projectId: string | undefined, projectKey: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!projectId || !projectKey) return
    const socket = getSocket()
    let connectedBefore = socket.connected

    const join = () => void socket.emitWithAck('project:join', { projectRef: projectId })
    const onConnect = () => {
      join()
      if (connectedBefore) {
        void queryClient.invalidateQueries({ queryKey: boardKeys.all(projectId) })
      }
      connectedBefore = true
    }
    // An open card drawer refetches; a version it already has is a no-op.
    const onCard = (card: CardSummary) => {
      upsertCard(queryClient, projectId, card)
      void queryClient.invalidateQueries({ queryKey: cardKeys.byNumber(projectId, card.number) })
      void queryClient.invalidateQueries({ queryKey: cardKeys.activity(card.id) })
      void queryClient.invalidateQueries({ queryKey: cardKeys.reviews(card.id) })
      // A bug's open card lists it under "Bugs encontrados".
      if (card.type === 'BUG') {
        void queryClient.invalidateQueries({ queryKey: ['cards', 'number', projectId] })
      }
    }
    const onCardDeleted = ({ id }: { id: string }) => {
      removeCard(queryClient, projectId, id)
      void queryClient.invalidateQueries({ queryKey: ['cards', 'number', projectId] })
    }
    const onColumns = () => queryClient.invalidateQueries({ queryKey: boardKeys.all(projectId) })
    const onBoards = () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: boardKeys.list(projectId) }),
        queryClient.invalidateQueries({ queryKey: boardKeys.all(projectId) }),
      ])
    const onProject = () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.one(projectKey) }),
        queryClient.invalidateQueries({ queryKey: projectKeys.me(projectKey) }),
        queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) }),
      ])
    const onTags = () => queryClient.invalidateQueries({ queryKey: boardKeys.tags(projectId) })
    const onSprint = () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['sprint'] }),
      ])
    const onComments = ({ cardId }: { cardId: string }) =>
      queryClient.invalidateQueries({ queryKey: cardKeys.comments(cardId) })
    const onTests = ({ cardId }: { cardId: string }) =>
      queryClient.invalidateQueries({ queryKey: cardKeys.tests(cardId) })
    const onAttachments = ({ cardId }: { cardId: string }) =>
      queryClient.invalidateQueries({ queryKey: cardKeys.attachments(cardId) })

    socket.on('connect', onConnect)
    socket.on('card.created', onCard)
    socket.on('card.updated', onCard)
    socket.on('card.moved', onCard)
    socket.on('card.deleted', onCardDeleted)
    socket.on('column.changed', onColumns)
    socket.on('boards.changed', onBoards)
    socket.on('project.changed', onProject)
    socket.on('tags.changed', onTags)
    socket.on('sprint.changed', onSprint)
    socket.on('comment.changed', onComments)
    socket.on('attachments.changed', onAttachments)
    socket.on('tests.changed', onTests)
    if (socket.connected) join()

    return () => {
      socket.emit('project:leave', { projectId })
      socket.off('connect', onConnect)
      socket.off('card.created', onCard)
      socket.off('card.updated', onCard)
      socket.off('card.moved', onCard)
      socket.off('card.deleted', onCardDeleted)
      socket.off('column.changed', onColumns)
      socket.off('boards.changed', onBoards)
      socket.off('project.changed', onProject)
      socket.off('tags.changed', onTags)
      socket.off('sprint.changed', onSprint)
      socket.off('comment.changed', onComments)
      socket.off('attachments.changed', onAttachments)
      socket.off('tests.changed', onTests)
    }
  }, [projectId, projectKey, queryClient])
}
