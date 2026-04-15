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
    <section className="panel recurring-panel">
      <div
        className="panel-header collapsible-panel-header"
        data-open={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="collapsible-panel-title">
          {isOpen ? <ChevronUp size={20} className="muted-icon" /> : <ChevronDown size={20} className="muted-icon" />}
          <div>
            <p className="panel-kicker">Recurring signals</p>
            <h2>Likely subscriptions & repeat payments</h2>
          </div>
        </div>
      </div>

      {isOpen && (
        recurringInsights.length === 0 ? (
          <div className="empty-state-block">
            <p className="empty-text">Recurring merchants appear when a pattern is detected.</p>
            <div className="empty-preview-list">
              <span>Netflix monthly</span>
              <span>Rent recurring</span>
            </div>
          </div>
        ) : (
          <div className="recurring-grid">
            {recurringInsights.map((insight) => (
              <button
                type="button"
                className="recurring-card interactive-list-item"
                key={insight.key}
                onClick={() => onRecurringSelect?.(insight.vendor)}
                aria-label={`${insight.vendor}, ${insight.cadence}, ${formatCurrency(insight.amount)}. Opens matching ledger rows.`}
              >
                <div className="recurring-card-top">
                  <div>
                    <strong>{insight.vendor}</strong>
                    <span>{insight.source}</span>
                  </div>
                  <span className="meta-chip neutral">{insight.cadence}</span>
                </div>
                <div className="recurring-values">
                  <strong>{formatCurrency(insight.amount)}</strong>
                  <span>
                    {insight.count} occurrence{insight.count === 1 ? '' : 's'}
                  </span>
                </div>
                <p>Last charged {formatStatementDate(insight.lastDate)}</p>
                <span className="drilldown-hint">Open ledger</span>
              </button>
            ))}
          </div>
        )
      )}
    </section>
  )
}
