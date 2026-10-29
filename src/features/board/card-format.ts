import type { EstimateView } from '@/features/projects/api'
import type { CardSummary } from './api'

// The project's preferred estimate first, the other one when it is missing.
export function estimateLabel(card: CardSummary, view: EstimateView): string | null {
  const points = card.storyPoints !== null ? `${card.storyPoints} pts` : null
  const hours =
    card.estimateMinutes !== null ? `${Math.round((card.estimateMinutes / 60) * 10) / 10} h` : null
  return view === 'POINTS' ? (points ?? hours) : (hours ?? points)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

// Due dates are calendar days (stored at UTC midnight): compare YYYY-MM-DD.
export const isoDay = (date: Date) => date.toISOString().slice(0, 10)
