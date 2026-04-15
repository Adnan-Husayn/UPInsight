import { useState, type Dispatch, type SetStateAction } from 'react'
import { motion } from 'framer-motion'
import { formatCurrency, formatStatementDate } from '../../lib/analyzer'
import type { Transaction } from '../../lib/types'

interface TransactionTableProps {
  filteredTransactions: Transaction[]
  selectedTransactions: Transaction[]
  selectedTransactionIds: string[]
  selectedTransactionsTotal: number
  setSelectedTransactionIds: Dispatch<SetStateAction<string[]>>
  toggleSelectedTransaction: (id: string) => void
  search: string
  setSearch: (s: string) => void
  categoryFilter: string
  setCategoryFilter: (s: string) => void
  sourceFilter: string
  setSourceFilter: (s: string) => void
  typeFilter: string
  setTypeFilter: (s: string) => void
  dateFilter: string
  setDateFilter: (s: string) => void
  categoryOptions: string[]
  sourceOptions: string[]
  availableCategories: string[]
  onInlineApplyRule: (transaction: Transaction, category: string) => void
  queryInsights: string[]
  onApplyQueryExample: (query: string) => void
}

export function TransactionTable({
  filteredTransactions,
  selectedTransactions,
  selectedTransactionIds,
  selectedTransactionsTotal,
  setSelectedTransactionIds,
  toggleSelectedTransaction,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  sourceFilter,
  setSourceFilter,
  typeFilter,
  setTypeFilter,
  dateFilter,
  setDateFilter,
  categoryOptions,
  sourceOptions,
  availableCategories,
  onInlineApplyRule,
  queryInsights,
  onApplyQueryExample,
}: TransactionTableProps) {
  const allSelected = filteredTransactions.length > 0 && selectedTransactions.length === filteredTransactions.length
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null)
  const [draftCategories, setDraftCategories] = useState<Record<string, string>>({})

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedTransactionIds([])
    } else {
      setSelectedTransactionIds(filteredTransactions.map(t => t.id))
    }
  }

  const renderMetaTags = (transaction: Transaction) => (
    <div className="table-tags">
      {transaction.confidenceLabel !== 'high' ? (
        <span className={`meta-chip ${transaction.confidenceLabel}`}>{transaction.confidenceLabel} confidence</span>
      ) : null}
      {transaction.isDuplicate ? <span className="meta-chip neutral">Deduped</span> : null}
      {transaction.recurringCount > 1 ? (
        <span className="meta-chip neutral">
          {transaction.recurringCadence || 'Recurring'} • {transaction.recurringCount}x
        </span>
      ) : null}
      {transaction.category === 'Uncategorized' ? <span className="meta-chip neutral">Needs category</span> : null}
    </div>
  )

  const getDraftCategory = (transaction: Transaction) =>
    draftCategories[transaction.id] ??
    (transaction.category !== 'Uncategorized' ? transaction.category : '')

  const renderInlineRuleEditor = (transaction: Transaction) => {
    const isOpen = activeEditorId === transaction.id
    const draftCategory = getDraftCategory(transaction)

    return (
      <div className="inline-rule-shell">
        <button
          type="button"
          className="button button-tertiary compact"
          onClick={() => {
            setActiveEditorId((current) => (current === transaction.id ? null : transaction.id))
            setDraftCategories((current) =>
              transaction.id in current
                ? current
                : {
                    ...current,
                    [transaction.id]: transaction.category !== 'Uncategorized' ? transaction.category : '',
                  },
            )
          }}
        >
          {isOpen ? 'Close editor' : 'Categorize'}
        </button>

        {isOpen ? (
          <div className="inline-rule-editor">
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
              type="button"
              className="button button-secondary compact"
              onClick={() => onInlineApplyRule(transaction, draftCategory)}
              disabled={!draftCategory}
            >
              Save rule
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="panel wide-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Ledger explorer</p>
          <h2>Transactions</h2>
          <p className="panel-support-note">Search, filter, select, and categorize rows inline.</p>
        </div>
      </div>
      <div className="filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Try: food spending above ₹500 in march"
        />
        <input 
          type="date" 
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          placeholder="Filter by date"
        />
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
          {sourceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="All">All types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
      </div>

      <div className="ledger-query-bar">
        {queryInsights.length > 0 ? (
          <div className="empty-preview-list">
            {queryInsights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : (
          <div className="empty-preview-list">
            {[
              'food spending above ₹500 in march',
              'salary credits in april',
              'refunds from google pay',
            ].map((example) => (
              <button
                type="button"
                key={example}
                className="query-example-chip"
                onClick={() => onApplyQueryExample(example)}
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="selection-toolbar">
        <button className="button button-secondary compact" onClick={handleSelectAll}>
          {allSelected ? 'Deselect all' : 'Select all displayed'}
        </button>
        <button
          className="button button-tertiary compact"
          onClick={() => setSelectedTransactionIds([])}
          disabled={selectedTransactions.length === 0}
        >
          Clear selection
        </button>
      </div>

      <div className="table-wrap desktop-ledger-table">
        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th>Date</th>
              <th>Details</th>
              <th>Category</th>
              <th>Source</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <motion.tbody 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.02 } }
            }}
          >
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  <div className="empty-state-block">
                    <p className="empty-text">No transactions match the current filters.</p>
                    <div className="empty-preview-list">
                      <span>Vendor search</span>
                      <span>Inline category fixes</span>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <motion.tr 
                  key={transaction.id}
                  variants={{
                    hidden: { opacity: 0, y: 4 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedTransactionIds.includes(transaction.id)}
                      onChange={() => toggleSelectedTransaction(transaction.id)}
                    />
                  </td>
                  <td>
                    <div className="table-date">
                      <strong>{formatStatementDate(transaction.date)}</strong>
                      <span>{transaction.time || 'Time unavailable'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="table-details">
                      <strong>{transaction.description}</strong>
                      <span>{transaction.accountHint || transaction.referenceId || 'No reference details'}</span>
                      {transaction.referenceId ? <span>ID: {transaction.referenceId}</span> : null}
                      {transaction.utr ? <span>UTR: {transaction.utr}</span> : null}
                      {renderMetaTags(transaction)}
                      {renderInlineRuleEditor(transaction)}
                    </div>
                  </td>
                  <td>{transaction.category}</td>
                  <td>{transaction.source}</td>
                  <td>
                    <span className={`pill ${transaction.type}`}>{transaction.type}</span>
                  </td>
                  <td className={`amount-cell ${transaction.type}`}>
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </td>
                </motion.tr>
              ))
            )}
          </motion.tbody>
        </table>
      </div>

      <div className="mobile-ledger-list">
        {filteredTransactions.length === 0 ? (
          <div className="table-empty mobile-table-empty">No transactions match the current filters.</div>
        ) : (
          filteredTransactions.map((transaction) => (
            <article className="transaction-card" key={transaction.id}>
              <div className="transaction-card-top">
                <label className="transaction-select">
                  <input
                    type="checkbox"
                    checked={selectedTransactionIds.includes(transaction.id)}
                    onChange={() => toggleSelectedTransaction(transaction.id)}
                  />
                  <span>{formatStatementDate(transaction.date)}</span>
                </label>
                <strong className={`amount-cell ${transaction.type}`}>
                  {transaction.type === 'credit' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </strong>
              </div>
              <strong className="transaction-card-title">{transaction.description}</strong>
              <p className="transaction-card-subtitle">
                {transaction.time || 'Time unavailable'} • {transaction.source} • {transaction.category}
              </p>
              <p className="transaction-card-hint">
                {transaction.accountHint || transaction.referenceId || 'No reference details'}
              </p>
              {transaction.referenceId ? <p className="transaction-card-hint">ID: {transaction.referenceId}</p> : null}
              {transaction.utr ? <p className="transaction-card-hint">UTR: {transaction.utr}</p> : null}
              {renderMetaTags(transaction)}
              {renderInlineRuleEditor(transaction)}
              <div className="transaction-card-footer">
                <span className={`pill ${transaction.type}`}>{transaction.type}</span>
                <span>{transaction.vendor || 'Unknown vendor'}</span>
              </div>
            </article>
          ))
        )}
      </div>

      {selectedTransactions.length > 0 && (
        <div className="receipt-panel">
          <h3 className="receipt-title">Selection receipt</h3>
          <div className="receipt-row">
            <span>Items Selected</span>
            <strong>{selectedTransactions.length}</strong>
          </div>
          <div className="receipt-row receipt-total-row">
            <span>Total Sum</span>
            <strong>{formatCurrency(selectedTransactionsTotal)}</strong>
          </div>
        </div>
      )}
    </div>
  )
}
