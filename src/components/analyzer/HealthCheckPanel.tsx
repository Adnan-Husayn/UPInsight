import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { InfoTooltip } from '../ui/InfoTooltip'
import type { StatementHealthReport } from '../../lib/analyzer'

interface HealthCheckPanelProps {
  health: StatementHealthReport
}

export function HealthCheckPanel({ health }: HealthCheckPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isSampleData = health.pageCount === 0

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
          <h3>Statement quality</h3>
          <InfoTooltip
            label="Statement quality"
            description="Estimates statement readability and completeness based on embedded text, OCR fallback, and row normalization."
          />
        </div>

        <div className="health-compact-summary mono muted">
          {isSampleData ? (
            <span>Sample data, no PDF parsed</span>
          ) : (
            <span>
              Quality {health.score}/100 · {health.pageCount} {health.pageCount === 1 ? 'page' : 'pages'} · {health.ocrPages} OCR · {health.malformedCount} unclear
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="collapsible-body">
          {isSampleData ? (
            <p className="empty-text">Sample statements do not include raw PDF pages or parser diagnostics.</p>
          ) : health.issues.length === 0 ? (
            <p className="empty-text">No parsing issues detected. All pages and rows were cleanly recognized.</p>
          ) : (
            <div className="health-issue-list">
              {health.issues.map((issue) => (
                <article className={`health-issue ${issue.severity}`} key={`${issue.title}-${issue.detail}`}>
                  <div className="health-issue-top">
                    <strong>{issue.title}</strong>
                    <span className="cashflow-kind-chip">{issue.severity}</span>
                  </div>
                  <p>{issue.detail}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
