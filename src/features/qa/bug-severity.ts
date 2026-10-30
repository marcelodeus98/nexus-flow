export type BugSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

// Most severe first, as the API orders them.
export const severityLabels: Record<BugSeverity, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
}

// Mantine colors for badges.
export const severityColors: Record<BugSeverity, string> = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'yellow',
  LOW: 'gray',
}

export const severityOptions = (Object.keys(severityLabels) as BugSeverity[]).map((value) => ({
  value,
  label: severityLabels[value],
}))
