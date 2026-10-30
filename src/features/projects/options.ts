import { methodologyLabels } from './api'

// Select options shared by the project forms.
export const methodologyOptions = Object.entries(methodologyLabels).map(([value, label]) => ({
  value,
  label,
}))

export const estimateViewOptions = [
  { value: 'POINTS', label: 'Story points' },
  { value: 'HOURS', label: 'Horas' },
]
