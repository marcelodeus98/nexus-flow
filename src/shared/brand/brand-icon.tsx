import { useId } from 'react'

type BrandIconProps = {
  /** Altura em px; a largura acompanha a proporção do símbolo. */
  size?: number
  className?: string
}

const VIEWBOX_WIDTH = 168
const VIEWBOX_HEIGHT = 154

/**
 * Símbolo "N" da Nexa (o mesmo do Nexa Assets). Os ids de gradiente/máscara saem de `useId`
 * porque o símbolo aparece mais de uma vez na mesma página (sidebar + login).
 */
export function BrandIcon({ size = 28, className }: BrandIconProps) {
  const id = useId().replace(/:/g, '')
  const left = `${id}-left`
  const right = `${id}-right`
  const band = `${id}-band`
  const cut = `${id}-cut`

  return (
    <svg
      className={className}
      width={(size * VIEWBOX_WIDTH) / VIEWBOX_HEIGHT}
      height={size}
      viewBox={`9 9 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={left} x1="0" y1="52" x2="0" y2="157" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#007E8F" />
          <stop offset="1" stopColor="#08B3B6" />
        </linearGradient>
        <linearGradient id={right} x1="0" y1="14" x2="0" y2="121" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1BC4C0" />
          <stop offset="1" stopColor="#007888" />
        </linearGradient>
        <linearGradient id={band} x1="40" y1="20" x2="140" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#20C7C3" />
          <stop offset="0.55" stopColor="#08ADBC" />
          <stop offset="1" stopColor="#07B0B5" />
        </linearGradient>
        <mask id={cut} maskUnits="userSpaceOnUse" x="0" y="0" width="186" height="172">
          <rect x="0" y="0" width="186" height="172" fill="#fff" />
          <line
            x1="52"
            y1="38"
            x2="131"
            y2="133"
            stroke="#000"
            strokeWidth="71"
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <g mask={`url(#${cut})`}>
        <path
          d="M14 153V58a14 14 0 0 1 14-14h27v109a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z"
          fill={`url(#${left})`}
        />
        <path
          d="M131 18a4 4 0 0 1 4-4h33a4 4 0 0 1 4 4v95a14 14 0 0 1-14 14h-27z"
          fill={`url(#${right})`}
        />
      </g>
      <line
        x1="52"
        y1="38"
        x2="131"
        y2="133"
        stroke={`url(#${band})`}
        strokeWidth="48"
        strokeLinecap="round"
      />
    </svg>
  )
}
