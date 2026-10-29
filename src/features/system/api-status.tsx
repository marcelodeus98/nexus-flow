import { useApiHealth } from './use-api-health'

export function ApiStatus() {
  const { data, isPending, isError } = useApiHealth()

  const state = isPending
    ? { label: 'Verificando API…', dot: 'bg-slate-400' }
    : isError || data.status !== 'ok'
      ? { label: 'API indisponível', dot: 'bg-red-500' }
      : { label: 'API e banco operando', dot: 'bg-emerald-500' }

  return (
    <p role="status" className="inline-flex items-center gap-2 text-sm text-slate-600">
      <span className={`size-2 rounded-full ${state.dot}`} aria-hidden />
      {state.label}
    </p>
  )
}
