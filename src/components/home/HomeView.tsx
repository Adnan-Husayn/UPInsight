import { LandingHero } from './LandingHero'
import type { ViewMode } from '../layout/Topbar'

interface HomeViewProps {
  setView: (view: ViewMode) => void
  loadDemo: () => void
}

export function HomeView({ setView, loadDemo }: HomeViewProps) {
  return (
    <main className="landing-shell">
      <LandingHero setView={setView} loadDemo={loadDemo} />

      <section className="privacy-explainer">
        <div className="privacy-icon">🔒</div>
        <div className="privacy-content">
          <h3>Your data stays in your browser.</h3>
          <p>No login, no server storage, no external processing.</p>
        </div>
      </section>

      <section className="home-feature-grid">
        <article className="info-card">
          <span className="info-index">01</span>
          <h2>Private by default</h2>
          <p>Parse statements locally. Nothing is uploaded.</p>
        </article>
        <article className="info-card">
          <span className="info-index">02</span>
          <h2>Works with mixed statements</h2>
          <p>Combine PhonePe and GPay PDFs in one workspace.</p>
        </article>
        <article className="info-card">
          <span className="info-index">03</span>
          <h2>Built for review</h2>
          <p>Inspect trends, fix categories, and export a clean ledger.</p>
        </article>
      </section>

      <section className="home-split-section">
        <article className="story-panel">
          <p className="eyebrow">Workflow</p>
          <h2>Upload. Review. Refine.</h2>
          <div className="story-points">
            <div>
              <strong>Upload</strong>
              <span>PDFs or CSVs in one place.</span>
            </div>
            <div>
              <strong>Review</strong>
              <span>See trends, vendors, and flagged rows.</span>
            </div>
            <div>
              <strong>Refine</strong>
              <span>Save rules and export a cleaner ledger.</span>
            </div>
          </div>
        </article>

        <article className="preview-panel">
          <div className="preview-grid">
            <div className="preview-card tall">
              <span>Overview</span>
              <strong>See where money moved this month</strong>
              <div className="preview-bars">
                <i style={{ width: '84%' }}></i>
                <i style={{ width: '61%' }}></i>
                <i style={{ width: '48%' }}></i>
              </div>
            </div>
            <div className="preview-card">
              <span>Ledger</span>
              <strong>Drill into matching rows fast</strong>
            </div>
            <div className="preview-card">
              <span>Workspaces</span>
              <strong>Keep personal and business separate</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="motion-ribbon" aria-hidden="true">
        <div className="ribbon-track">
          <span>PhonePe statements</span>
          <span>Google Pay statements</span>
          <span>Local categorization</span>
          <span>CSV export</span>
          <span>No cloud upload</span>
          <span>PhonePe statements</span>
          <span>Google Pay statements</span>
          <span>Local categorization</span>
          <span>Trends by date and month</span>
        </div>
      </section>
    </main>
  )
}
