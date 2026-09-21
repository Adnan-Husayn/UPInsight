import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency, formatStatementDate, type CashflowMarker } from '../../lib/analyzer'

interface CashflowTimelineProps {
  events: CashflowMarker[]
  onSelectEvent: (event: CashflowMarker) => void
}

export function CashflowTimeline({ events, onSelectEvent }: CashflowTimelineProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section className="panel collapsible-panel full-width">
      <div
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
      >
        <div className="collapsible-title">
          {isOpen ? <ChevronUp size={16} className="muted" /> : <ChevronDown size={16} className="muted" />}
          <h3>Unusual transactions</h3>
        </div>
        <span className="collapsible-count mono muted">{events.length}</span>
      </div>

      {isOpen && (
        <div className="collapsible-body">
          {events.length === 0 ? (
            <p className="empty-text">No spikes, refunds, or unusual markers found in this period.</p>
          ) : (
            <div className="cashflow-timeline-list">
              {events.map((event) => (
                <div
                  className="cashflow-event-row"
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cashflow-event-left">
                    <span className="mono muted">{formatStatementDate(event.date)}</span>
                    <strong className="cashflow-event-label">{event.label}</strong>
                    <span className="cashflow-kind-chip">{event.kind}</span>
                  </div>
                  <div className="cashflow-event-right">
                    <span className={`mono ${event.type === 'credit' ? 'credit' : 'debit'}`}>
                      {event.type === 'credit' ? '+' : '−'}
                      {formatCurrency(event.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
