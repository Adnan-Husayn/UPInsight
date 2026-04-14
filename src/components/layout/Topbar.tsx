import { UploadCloud } from 'lucide-react'

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
      <div className="brand-mark">
        <span className="brand-dot"></span>
        <div>
          <strong>Spending Analyzer</strong>
          <span>Private UPI statement intelligence</span>
        </div>
      </div>

      <nav className="topnav">
        <button
          className={`nav-link ${view === 'home' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          Home
        </button>
        <button
          className={`nav-link ${view === 'tool' ? 'active' : ''}`}
          onClick={() => setView('tool')}
        >
          Analyzer
        </button>
      </nav>

      <div className="topbar-actions">
        <button 
          className="upload-btn" 
          onClick={onUploadClick}
        >
          <UploadCloud size={18} strokeWidth={2.5} />
          Upload PDF
        </button>
      </div>
    </header>
  )
}
