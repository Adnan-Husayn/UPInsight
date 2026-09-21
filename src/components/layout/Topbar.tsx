import { ThemeToggle } from '../ui/ThemeToggle'

export type ViewMode = 'home' | 'tool'

interface TopbarProps {
  view: ViewMode
  setView: (view: ViewMode) => void
  onUploadClick: () => void
}

export function Topbar({
  view,
  setView,
  onUploadClick,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div 
          className="brand-mark" 
          onClick={() => setView('home')} 
          role="button" 
          tabIndex={0}
        >
          <strong>UPInsight</strong>
        </div>
        <nav className="topnav">
          <button
            className={`nav-link ${view === 'home' ? 'active' : ''}`}
            onClick={() => setView('home')}
          >
            Overview
          </button>
          <button
            className={`nav-link ${view === 'tool' ? 'active' : ''}`}
            onClick={() => setView('tool')}
          >
            Analyzer
          </button>
        </nav>
        <div className="topbar-actions">
          <ThemeToggle />
          <button 
            className="button button-primary compact upload-statement-btn" 
            onClick={onUploadClick}
          >
            <span className="desktop-btn-label">Upload statement</span>
            <span className="mobile-btn-label">Upload</span>
          </button>
        </div>
      </div>
    </header>
  )
}
