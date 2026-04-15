type SectionId = 'overview' | 'budgets' | 'rules' | 'ledger'

interface MobileSectionNavProps {
  activeSection: SectionId
  onJump: (section: SectionId) => void
}

const items: Array<{ id: SectionId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'budgets', label: 'Planning' },
  { id: 'rules', label: 'Review' },
  { id: 'ledger', label: 'Ledger' },
]

export function MobileSectionNav({ activeSection, onJump }: MobileSectionNavProps) {
  return (
    <nav className="mobile-section-nav" aria-label="Analyzer sections">
      {items.map((item) => (
        <button
          key={item.id}
          className={`mobile-section-link ${activeSection === item.id ? 'active' : ''}`}
          onClick={() => onJump(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
