import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency, formatStatementDate } from '../../lib/analyzer'
import type { DuplicateGroup } from '../../lib/analyzer'
import type { Transaction } from '../../lib/types'
import { InfoTooltip } from '../ui/InfoTooltip'

interface ReviewQueueProps {
  transactions: Transaction[]
  duplicateGroups: DuplicateGroup[]
  availableCategories: string[]
  onApplyCategoryRule: (transaction: Transaction, category: string) => void
  onMarkReviewed: (transactionId: string) => void
}

export function ReviewQueue({
  transactions,
  duplicateGroups,
  availableCategories,
  onApplyCategoryRule,
  onMarkReviewed,
}: ReviewQueueProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftCategories, setDraftCategories] = useState<Record<string, string>>({})

  const duplicateCount = useMemo(
    () => duplicateGroups.reduce((sum, group) => sum + group.count - 1, 0),
    [duplicateGroups],
  )

  return (
    <section className="panel review-panel">
      <div
        className="panel-header review-header collapsible-panel-header"
        data-open={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="collapsible-panel-title">
          {isOpen ? <ChevronUp size={20} className="muted-icon" /> : <ChevronDown size={20} className="muted-icon" />}
          <div>
            <div className="panel-label-with-help">
              <p className="panel-kicker">Review queue</p>
              <InfoTooltip
                label="What confidence means"
                description="Confidence reflects how sure the parser is about a transaction. Lower-confidence rows or uncategorized spends appear here first so you can review them before they shape the analytics."
              />
            </div>
            <h2>Confidence checks & duplicate merge review</h2>
          </div>
        </div>
        <span className="review-count-chip">
          {transactions.length} item{transactions.length === 1 ? '' : 's'} need attention
        </span>
      </div>

      {isOpen && (
        <>

      <div className="review-summary-grid">
        <article className="review-summary-card">
          <span>Needs review</span>
          <strong>{transactions.length}</strong>
          <p>Uncertain rows waiting for a decision.</p>
        </article>
        <article className="review-summary-card">
          <span>Duplicates merged</span>
          <strong>{duplicateCount}</strong>
          <p>Overlaps collapsed into one ledger entry.</p>
        </article>
      </div>

      {duplicateGroups.length > 0 ? (
        <div className="duplicate-summary">
          <div className="compact-section-head">
            <strong>Merged duplicate groups</strong>
            <span>{duplicateGroups.length}</span>
          </div>
          <div className="duplicate-list">
            {duplicateGroups.slice(0, 4).map((group) => {
              const representative = group.transactions[0]
              return (
                <article className="duplicate-item" key={group.key}>
                  <div>
                    <strong>{representative.vendor || representative.description}</strong>
                    <span>
                      {formatStatementDate(representative.date)} • {formatCurrency(representative.amount)}
                    </span>
                  </div>
                  <span className="meta-chip neutral">Merged {group.count} overlaps</span>
                </article>
              )
            })}
          </div>
        </div>
      ) : null}

      {transactions.length === 0 ? (
        <div className="empty-state-block review-empty">
          <p className="empty-text">Nothing needs review right now.</p>
          <div className="empty-preview-list">
            <span>Missing dates</span>
            <span>Uncategorized spends</span>
          </div>
        </div>
      ) : (
        <div className="review-list">
          {transactions.map((transaction) => {
            const draftCategory =
              draftCategories[transaction.id] ??
              (transaction.category !== 'Uncategorized' ? transaction.category : '')

            return (
              <article className="review-item-card" key={transaction.id}>
                <div className="review-item-top">
                  <div>
                    <strong>{transaction.vendor || transaction.description}</strong>
                    <p>
                      {formatStatementDate(transaction.date)} • {transaction.time || 'Time unavailable'} • {transaction.source}
                    </p>
                  </div>
                  <div className="review-item-amount">
                    <span className={`meta-chip ${transaction.confidenceLabel}`}>
                      {transaction.confidenceLabel} confidence
                    </span>
                    <strong className={transaction.type === 'credit' ? 'amount-positive' : 'amount-negative'}>
                      {transaction.type === 'credit' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </strong>
                  </div>
                </div>

                <p className="review-description">{transaction.description}</p>

                <div className="review-reasons">
                  {transaction.reviewReasons.length > 0 ? (
                    transaction.reviewReasons.map((reason) => (
                      <span className="meta-chip neutral" key={reason}>
                        {reason}
                      </span>
                    ))
                  ) : (
                    <span className="meta-chip neutral">Category can still be refined</span>
                  )}
                </div>

                <div className="review-actions">
                  <select
                    value={draftCategory}
                    onChange={(event) =>
                      setDraftCategories((current) => ({
                        ...current,
                        [transaction.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Assign category…</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <button
                    className="button button-primary compact"
                    onClick={() => onApplyCategoryRule(transaction, draftCategory)}
                    disabled={!draftCategory}
                  >
                    Save rule & resolve
                  </button>
                  <button
                    className="button button-secondary compact"
                    onClick={() => onMarkReviewed(transaction.id)}
                  >
                    Mark reviewed
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
        </>
      )}
    </section>
  )
}
