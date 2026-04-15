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
    <section className="panel cashflow-panel">
      <div
        className="panel-header collapsible-panel-header"
        data-open={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="collapsible-panel-title">
          {isOpen ? <ChevronUp size={20} className="muted-icon" /> : <ChevronDown size={20} className="muted-icon" />}
          <div>
            <p className="panel-kicker">Cash flow timeline</p>
            <h2>Spikes, refunds, and salary markers</h2>
          </div>
        </div>
      </div>

      {isOpen && (
        events.length === 0 ? (
          <div className="empty-state-block">
            <p className="empty-text">Cash flow markers appear when notable events are detected.</p>
            <div className="empty-preview-list">
              <span>Salary credits</span>
              <span>Large-spend spikes</span>
            </div>
          </div>
        ) : (
          <div className="cashflow-timeline">
            {events.map((event) => (
              <button
                type="button"
                className="cashflow-event"
                key={event.id}
                onClick={() => onSelectEvent(event)}
                aria-label={`${event.label}, ${formatCurrency(event.amount)}, ${event.kind}. Opens matching ledger rows.`}
              >
                <div className="cashflow-event-marker">
                  <span className={`timeline-dot ${event.kind}`}></span>
                  <span>{formatStatementDate(event.date)}</span>
                </div>
                <div className="cashflow-event-copy">
                  <strong>{event.label}</strong>
                  <p>{event.detail}</p>
                </div>
                <div className="cashflow-event-amount">
                  <span className={`meta-chip neutral`}>{event.kind}</span>
                  <strong className={event.type === 'credit' ? 'amount-positive' : 'amount-negative'}>
                    {event.type === 'credit' ? '+' : '-'}
                    {formatCurrency(event.amount)}
                  </strong>
                  <span className="drilldown-hint">Open ledger</span>
                </div>
              </button>
            ))}
          </div>
        )
      )}
    </section>
  )
}
