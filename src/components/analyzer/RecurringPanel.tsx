import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency, formatStatementDate } from '../../lib/analyzer'
import type { RecurringInsight } from '../../lib/analyzer'

interface RecurringPanelProps {
  recurringInsights: RecurringInsight[]
  onRecurringSelect?: (vendor: string) => void
}

export function RecurringPanel({ recurringInsights, onRecurringSelect }: RecurringPanelProps) {
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
          <h3>Recurring payments</h3>
        </div>
        <span className="collapsible-count mono muted">{recurringInsights.length}</span>
      </div>

      {isOpen && (
        <div className="collapsible-body">
          {recurringInsights.length === 0 ? (
            <p className="empty-text">No recurring merchants detected.</p>
          ) : (
            <div className="recurring-list">
              {recurringInsights.map((insight) => (
                <div
                  className="recurring-row"
                  key={insight.key}
                  onClick={() => onRecurringSelect?.(insight.vendor)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="recurring-row-left">
                    <strong>{insight.vendor}</strong>
                    <span className="recurring-cadence-chip">{insight.cadence}</span>
                    <span className="muted text-xs">
                      {insight.count} charges · Last {formatStatementDate(insight.lastDate)}
                    </span>
                  </div>
                  <div className="recurring-row-right">
                    <strong className="mono">{formatCurrency(insight.amount)}</strong>
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
