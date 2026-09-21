import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { MonthlyNarrative } from '../../lib/analyzer'

interface LocalSummaryPanelProps {
  summaries: MonthlyNarrative[]
}

export function LocalSummaryPanel({ summaries }: LocalSummaryPanelProps) {
  const [isOpen, setIsOpen] = useState(true)

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
          <h3>Monthly summary</h3>
        </div>
      </div>

      {isOpen && (
        <div className="collapsible-body">
          {summaries.length === 0 ? (
            <p className="empty-text">Monthly notes appear once enough activity is available.</p>
          ) : (
            <div className="summary-list">
              {summaries.map((summary) => (
                <article className="summary-card" key={summary.month}>
                  <strong className="summary-month-title">{summary.title}</strong>
                  <ul className="summary-bullets">
                    {summary.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
