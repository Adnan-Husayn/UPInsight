import { InfoTooltip } from '../ui/InfoTooltip'
import type { StatementHealthReport } from '../../lib/analyzer'

interface HealthCheckPanelProps {
  health: StatementHealthReport
}

export function HealthCheckPanel({ health }: HealthCheckPanelProps) {
  return (
    <section className="panel health-panel">
      <div className="panel-header">
        <div>
          <div className="panel-label-with-help">
            <p className="panel-kicker">Statement quality checks</p>
            <InfoTooltip
              label="What statement quality means"
              description="This panel estimates how complete and readable the uploaded statement batch looks after parsing. Lower scores usually mean OCR-heavy pages, malformed rows, or date gaps."
            />
          </div>
          <h2>Readability and parser signals</h2>
        </div>
        <div className="health-score-block">
          <span className="health-score-caption">
            Quality score
            <InfoTooltip
              label="Quality score"
              description="A quick estimate of statement reliability from 0 to 100. Higher scores usually mean cleaner pages, fewer malformed rows, and fewer parse warnings."
              align="right"
            />
          </span>
          <span className="health-score">{health.score}/100</span>
        </div>
      </div>

      <div className="health-meta-grid">
        <article className="health-meta-card">
          <div className="health-meta-label">
            <span>Pages checked</span>
            <InfoTooltip
              label="Pages checked"
              description="How many statement pages were processed in this workspace for the current batch."
            />
          </div>
          <strong>{health.pageCount}</strong>
        </article>
        <article className="health-meta-card">
          <div className="health-meta-label">
            <span>Image-read pages</span>
            <InfoTooltip
              label="Image-read pages"
              description="Pages where the app had to fall back to OCR because regular embedded text was missing or too weak."
            />
          </div>
          <strong>{health.ocrPages}</strong>
        </article>
        <article className="health-meta-card">
          <div className="health-meta-label">
            <span>Unclear rows</span>
            <InfoTooltip
              label="Unclear rows"
              description="Rows where the parser could not fully normalize the transaction shape, usually because the PDF layout was inconsistent."
              align="right"
            />
          </div>
          <strong>{health.malformedCount}</strong>
        </article>
      </div>

      {health.issues.length === 0 ? (
        <div className="empty-state-block">
          <p className="empty-text">No obvious quality issues were detected.</p>
        </div>
      ) : (
        <div className="health-issue-list">
          {health.issues.map((issue) => (
            <article className={`health-issue ${issue.severity}`} key={`${issue.title}-${issue.detail}`}>
              <div className="health-issue-top">
                <strong>{issue.title}</strong>
                <span className={`meta-chip ${issue.severity === 'critical' ? 'low' : issue.severity === 'warning' ? 'medium' : 'neutral'}`}>
                  {issue.severity}
                </span>
              </div>
              <p>{issue.detail}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
