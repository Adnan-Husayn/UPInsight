interface HomeViewProps {
  onUpload: () => void
  loadDemo: () => void
}

export function HomeView({ onUpload, loadDemo }: HomeViewProps) {
  return (
    <main className="landing-shell">
      <section className="hero">
        <div className="hero-left">
          <h1>See where your UPI money went.</h1>
          <p className="hero-subhead">
            Upload a PhonePe or Google Pay statement. Get every transaction categorized, monthly totals, and a CSV export. It all runs in your browser.
          </p>
          <div className="hero-ctas">
            <button className="button button-primary" onClick={onUpload}>
              Upload a statement
            </button>
            <button className="button button-tertiary" onClick={loadDemo}>
              Try sample data →
            </button>
          </div>
          <p className="privacy-line">
            Runs entirely in your browser. Your statement is never uploaded. You can check the network tab.
          </p>
        </div>

        <div className="hero-right">
          <div className="product-mockup">
            <div className="mockup-header">
              <div className="mockup-kpis">
                <div className="mockup-kpi">
                  <span className="mockup-label">Spent</span>
                  <span className="mockup-value mono">₹25,700</span>
                </div>
                <div className="mockup-kpi">
                  <span className="mockup-label">Transactions</span>
                  <span className="mockup-value mono">28</span>
                </div>
              </div>
            </div>
            <div className="mockup-body">
              <div className="mockup-sidebar">
                <div className="mockup-bar">
                  <div className="mockup-bar-meta">
                    <span className="mockup-bar-label">Food &amp; Dining</span>
                    <span className="mockup-bar-value mono">₹12,400</span>
                  </div>
                  <div className="mockup-bar-track">
                    <div className="mockup-bar-fill bg-chart-1" style={{ width: '48%' }}></div>
                  </div>
                </div>
                <div className="mockup-bar">
                  <div className="mockup-bar-meta">
                    <span className="mockup-bar-label">Transport</span>
                    <span className="mockup-bar-value mono">₹8,100</span>
                  </div>
                  <div className="mockup-bar-track">
                    <div className="mockup-bar-fill bg-chart-2" style={{ width: '32%' }}></div>
                  </div>
                </div>
                <div className="mockup-bar">
                  <div className="mockup-bar-meta">
                    <span className="mockup-bar-label">Shopping</span>
                    <span className="mockup-bar-value mono">₹5,200</span>
                  </div>
                  <div className="mockup-bar-track">
                    <div className="mockup-bar-fill bg-chart-3" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </div>

              <div className="mockup-table">
                <div className="mockup-row header">
                  <span className="mockup-date-col">Date</span>
                  <span className="mockup-merchant-col">Merchant</span>
                  <span className="mockup-category-col">Category</span>
                  <span className="text-right mockup-amount-col">Amount</span>
                </div>
                <div className="mockup-row">
                  <span className="mono mockup-date-col">17 Jan</span>
                  <span className="mockup-merchant-col">Swiggy</span>
                  <span className="mockup-category-col">Food &amp; Dining</span>
                  <span className="text-right mono debit mockup-amount-col">−₹450</span>
                </div>
                <div className="mockup-row">
                  <span className="mono mockup-date-col">17 Jan</span>
                  <span className="mockup-merchant-col">Uber</span>
                  <span className="mockup-category-col">Transport</span>
                  <span className="text-right mono debit mockup-amount-col">−₹210</span>
                </div>
                <div className="mockup-row">
                  <span className="mono mockup-date-col">16 Jan</span>
                  <span className="mockup-merchant-col">Amazon</span>
                  <span className="mockup-category-col">Shopping</span>
                  <span className="text-right mono debit mockup-amount-col">−₹1,299</span>
                </div>
                <div className="mockup-row">
                  <span className="mono mockup-date-col">16 Jan</span>
                  <span className="mockup-merchant-col">Blinkit</span>
                  <span className="mockup-category-col">Food &amp; Dining</span>
                  <span className="text-right mono debit mockup-amount-col">−₹840</span>
                </div>
                <div className="mockup-row">
                  <span className="mono mockup-date-col">15 Jan</span>
                  <span className="mockup-merchant-col">Zomato</span>
                  <span className="mockup-category-col">Food &amp; Dining</span>
                  <span className="text-right mono debit mockup-amount-col">−₹320</span>
                </div>
                <div className="mockup-row">
                  <span className="mono mockup-date-col">14 Jan</span>
                  <span className="mockup-merchant-col">Salary</span>
                  <span className="mockup-category-col">Income</span>
                  <span className="text-right mono credit mockup-amount-col">+₹45,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-grid">
          <div className="feature-column">
            <h3>Drop &amp; Parse</h3>
            <p>Drop in the PDF from PhonePe or GPay. Transactions are parsed in a few seconds, on your device.</p>
          </div>
          <div className="feature-column">
            <h3>Nothing leaves your device</h3>
            <p>No server, no account, no tracking. Open the network tab and check.</p>
          </div>
          <div className="feature-column">
            <h3>Refine &amp; Export</h3>
            <p>Fix any wrong categories, save rules for next time, and export a CSV for Excel or Sheets.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Built by Adnan · <a href="https://github.com" target="_blank" rel="noreferrer">Source on GitHub</a> · Runs locally in your browser</p>
      </footer>
    </main>
  )
}
