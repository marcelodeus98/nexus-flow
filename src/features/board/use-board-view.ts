import { useSearchParams } from 'react-router-dom'

export type BoardView = 'board' | 'list' | 'calendar'

const VIEWS: BoardView[] = ['board', 'list', 'calendar']
const storageKey = (projectKey: string) => `nexa-flow:view:${projectKey}`

function remembered(projectKey: string): BoardView {
  try {
    const value = localStorage.getItem(storageKey(projectKey))
    return VIEWS.includes(value as BoardView) ? (value as BoardView) : 'board'
  } catch {
    return 'board'
  }
}

// Board, list or calendar: in the URL (?view=, so a link opens the same
// view) and remembered per project in this browser for the next visit.
export function useBoardView(projectKey: string) {
  const [params, setParams] = useSearchParams()
  const fromUrl = params.get('view') as BoardView | null
  const view = fromUrl && VIEWS.includes(fromUrl) ? fromUrl : remembered(projectKey)

  const setView = (next: BoardView) => {
    try {
      localStorage.setItem(storageKey(projectKey), next)
    } catch {
      // Storage unavailable (private window): the URL still carries it.
    }
    setParams(
      () => {
        const search = new URLSearchParams(window.location.search)
        if (next === 'board') search.delete('view')
        else search.set('view', next)
        return search
      },
      { replace: true },
    )
  }
  return [view, setView] as const
}
