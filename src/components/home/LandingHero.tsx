import { formatCurrency } from '../../lib/analyzer'
import type { ViewMode } from '../layout/Topbar'

interface LandingHeroProps {
  setView: (view: ViewMode) => void
  loadDemo: () => void
}

export function LandingHero({ setView, loadDemo }: LandingHeroProps) {
  return (
    <section className="landing-hero">
      <div className="orbs">
        <span className="orb orb-one"></span>
        <span className="orb orb-two"></span>
        <span className="orb orb-three"></span>
      </div>

      <div className="landing-copy">
        <div className="trust-banner">
          <span className="trust-icon">🛡️</span>
          <span>Everything stays on your device</span>
        </div>
        <p className="eyebrow">Private UPI analysis</p>
        <h1>See your UPI spending clearly.</h1>
        <p className="hero-text landing-text">
          Upload statements, review transactions, and export a clean ledger without sending data anywhere.
        </p>
        <div className="hero-actions">
          <button className="button button-primary button-hero" onClick={() => setView('tool')}>
            Analyze statements
          </button>
          <button className="button button-secondary" onClick={loadDemo}>
            Preview sample workspace
          </button>
        </div>
        <p className="trust-subtext">Private. Local. PDF + CSV. No cloud upload.</p>
        <div className="hero-stat-row">
          <div className="hero-stat-card">
            <span>Inputs</span>
            <strong>2+</strong>
          </div>
          <div className="hero-stat-card">
            <span>Processing</span>
            <strong>100% local</strong>
          </div>
          <div className="hero-stat-card">
            <span>Output</span>
            <strong>CSV ready</strong>
          </div>
        </div>
      </div>

      <div className="landing-showcase">
        <article className="glass-card large">
          <p>Spend</p>
          <strong>{formatCurrency(14477.53)}</strong>
          <div className="mini-wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </article>
        <article className="glass-card offset">
          <p>Sources</p>
          <strong>PhonePe + Google Pay</strong>
          <div className="chip-row">
            <span>Local</span>
            <span>Private</span>
          </div>
        </article>
        <article className="glass-card trail">
          <p>Top category</p>
          <strong>Credit Card Payments</strong>
          <div className="ring-preview"></div>
        </article>
      </div>
    </section>
  )
}
