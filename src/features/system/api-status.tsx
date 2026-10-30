import { Tooltip } from '@mantine/core'
import { useApiHealth } from './use-api-health'

// A dot in the top bar: green while the API and the database answer.
export function ApiStatus() {
  const { data, isPending, isError } = useApiHealth()

  const state = isPending
    ? { label: 'Verificando API…', color: 'var(--nexa-slate-400)' }
    : isError || data.status !== 'ok'
      ? { label: 'API indisponível', color: 'var(--mantine-color-red-6)' }
      : { label: 'API e banco operando', color: 'var(--nexa-teal)' }

  return (
    <Tooltip label={state.label}>
      <span role="status" aria-label={state.label} style={{ display: 'inline-flex' }}>
        <span
          aria-hidden
          style={{ width: 8, height: 8, borderRadius: '50%', background: state.color }}
        />
      </span>
    </Tooltip>
  )
}
