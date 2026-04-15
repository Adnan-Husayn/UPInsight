import type { MonthlyNarrative } from '../../lib/analyzer'

interface LocalSummaryPanelProps {
  summaries: MonthlyNarrative[]
}

export function LocalSummaryPanel({ summaries }: LocalSummaryPanelProps) {
  return (
    <section className="panel local-summary-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Local monthly brief</p>
          <h2>Private month-by-month summaries</h2>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="empty-state-block">
          <p className="empty-text">Monthly notes appear once enough activity is available.</p>
          <div className="empty-preview-list">
            <span>Top category story</span>
            <span>Month-over-month shifts</span>
          </div>
        </div>
      ) : (
        <div className="summary-story-grid">
          {summaries.map((summary) => (
            <article className="summary-story-card" key={summary.month}>
              <span>{summary.title}</span>
              <ul className="summary-story-list">
                {summary.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
