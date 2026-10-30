import { BrandIcon } from './brand-icon'
import './brand-logo.css'

type BrandLogoProps = {
  /** Altura do símbolo em px; o wordmark escala junto. */
  size?: number
  className?: string
}

// Símbolo + wordmark empilhado ("Nexa" / "Flow"), no mesmo desenho do Nexa
// Assets. O texto herda `color`: serve no fundo navy e no claro.
export function BrandLogo({ size = 36, className }: BrandLogoProps) {
  return (
    <span
      className={['brand-logo', className].filter(Boolean).join(' ')}
      style={{ fontSize: size / 2 }}
      role="img"
      aria-label="Nexa Flow"
    >
      <BrandIcon size={size} />
      <span className="brand-logo__wordmark" aria-hidden="true">
        <span className="brand-logo__name">Nexa</span>
        <span className="brand-logo__descriptor">Flow</span>
      </span>
    </span>
  )
}
