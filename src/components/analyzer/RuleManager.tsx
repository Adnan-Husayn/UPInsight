import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CategoryRule } from '../../lib/types'
interface RuleManagerProps {
  rules: CategoryRule[]
  vendorOptions: string[]
  availableCategories: string[]
  pendingAssignments: Array<{ vendor: string; category: string }>
  ruleVendor: string
  newKeyword: string
  newCategory: string
  setRuleVendor: (v: string) => void
  setNewKeyword: (v: string) => void
  setNewCategory: (v: string) => void
  addPendingAssignment: () => void
  addRule: () => void
  regenerateCategories: () => void
  removeRule: (index: number) => void
}

export function RuleManager({
  rules,
  vendorOptions,
  availableCategories,
  pendingAssignments,
  ruleVendor,
  newKeyword,
  newCategory,
  setRuleVendor,
  setNewKeyword,
  setNewCategory,
  addPendingAssignment,
  addRule,
  regenerateCategories,
  removeRule,
}: RuleManagerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="panel rule-manager">
      <div
        className="panel-header collapsible-panel-header"
        data-open={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="collapsible-panel-title">
          {isOpen ? <ChevronUp size={20} className="muted-icon" /> : <ChevronDown size={20} className="muted-icon" />}
          <div>
            <p className="panel-kicker">Rules manager</p>
            <h2>Custom categorization</h2>
          </div>
        </div>
        <button
          className="button button-secondary compact"
          onClick={(e) => {
            e.stopPropagation()
            regenerateCategories()
          }}
          disabled={pendingAssignments.length === 0}
        >
          Regenerate
        </button>
      </div>
      
      {isOpen && (
        <div className="rule-manager-shell">
        <div className="rule-manager-composer">
          <div className="rules-form grid-groups">
            <div className="rules-grid">
              <div className="input-block">
                <label>1. Pick exact vendor</label>
                <select value={ruleVendor} onChange={(event) => setRuleVendor(event.target.value)}>
                  <option value="">Choose vendor...</option>
                  {vendorOptions.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-block">
                <label>OR type fuzzy keyword</label>
                <input
                  value={newKeyword}
                  onChange={(event) => setNewKeyword(event.target.value)}
                  placeholder="e.g. swiggy"
                />
              </div>

              <div className="input-block">
                <label>2. Assign to category</label>
                <div className="category-input-row">
                  <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
                    <option value="">Choose...</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <input
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    placeholder="Or new..."
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="button button-primary" onClick={addRule}>
                Save global rule
              </button>
              <button className="button button-secondary" onClick={addPendingAssignment}>
                Queue to batch
              </button>
            </div>
          </div>
        </div>

        <div className="rule-manager-lists">
          {pendingAssignments.length > 0 ? (
            <section className="pending-box compact-section">
              <div className="compact-section-head">
                <strong>Queued assignments</strong>
                <span>{pendingAssignments.length}</span>
              </div>
              <div className="pending-list pending-list-scroll">
                {pendingAssignments.map((assignment) => (
                  <div className="pending-item" key={`${assignment.vendor}-${assignment.category}`}>
                    <span>{assignment.vendor}</span>
                    <strong>{assignment.category}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rule-catalog compact-section">
            <div className="compact-section-head">
              <strong>Saved rules</strong>
              <span>{rules.length}</span>
            </div>
            <div className="rule-list rule-list-scroll">
              {rules.length === 0 ? (
                <p className="empty-text">Saved rules appear here.</p>
              ) : (
                rules.map((rule, index) => (
                  <div className="rule-item" key={`${rule.keyword}-${rule.category}-${index}`}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                      <strong>{rule.keyword}</strong>
                      <span style={{ color: 'var(--muted)' }}>{rule.category}</span>
                    </div>
                    <button className="button button-tertiary compact" onClick={() => removeRule(index)}>
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        </div>
      )}
    </div>
  )
}
