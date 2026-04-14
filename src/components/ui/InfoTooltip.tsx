import { CircleHelp } from 'lucide-react'

interface InfoTooltipProps {
  label: string
  description: string
  align?: 'left' | 'center' | 'right'
}

export function InfoTooltip({ label, description, align = 'center' }: InfoTooltipProps) {
  return (
    <span className={`info-tooltip info-tooltip-${align}`}>
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <CircleHelp size={14} strokeWidth={2} />
      </button>
      <span className="info-tooltip-bubble" role="tooltip">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
    </span>
  )
}
