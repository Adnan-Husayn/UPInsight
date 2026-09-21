import { type Dispatch, type SetStateAction, useState, useEffect } from 'react'
import { formatCurrency, formatTransactionDateTime } from '../../lib/analyzer'
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
  dateFilter?: string
  setDateFilter?: (s: string) => void
  categoryOptions: string[]
  sourceOptions: string[]
  availableCategories: string[]
  onInlineApplyRule: (transaction: Transaction, category: string) => void
  queryInsights: string[]
  onApplyQueryExample: (query: string) => void
}

const placeholders = [
  "Search merchant, UPI ID, amount…",
  "Try: food spending above ₹500 in march",
  "Try: salary credits in april"
]

export function TransactionTable({
  filteredTransactions,
  selectedTransactions,
  selectedTransactionIds,
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
  dateFilter = '',
  setDateFilter,
  categoryOptions,
  sourceOptions,
  availableCategories,
  onInlineApplyRule,
}: TransactionTableProps) {
  const allSelected = filteredTransactions.length > 0 && selectedTransactions.length === filteredTransactions.length
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % placeholders.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactionIds(filteredTransactions.map(t => t.id))
    } else {
      setSelectedTransactionIds([])
    }
  }

  const [bulkCategory, setBulkCategory] = useState('')

  const applyBulkCategory = () => {
    if (!bulkCategory) return
    selectedTransactions.forEach(t => {
      onInlineApplyRule(t, bulkCategory)
    })
    setBulkCategory('')
    setSelectedTransactionIds([])
  }

  return (
    <div className="panel transaction-panel">
      <div className="filter-bar">
        <input
          className="search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholders[placeholderIndex]}
        />
        <div className="filter-controls-group">
          <div className="select-wrap">
            <select 
              value={categoryFilter} 
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter by category"
            >
              <option value="All">All categories</option>
              {categoryOptions.filter(c => c !== 'All').map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="select-wrap">
            <select 
              value={sourceFilter} 
              onChange={(event) => setSourceFilter(event.target.value)}
              aria-label="Filter by source"
            >
              <option value="All">All sources</option>
              {sourceOptions.filter(s => s !== 'All').map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="select-wrap">
            <select 
              value={typeFilter} 
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Filter by type"
            >
              <option value="All">All types</option>
              <option value="credit">Credits only</option>
              <option value="debit">Debits only</option>
            </select>
          </div>
        </div>
      </div>

      {dateFilter && (
        <div className="active-date-chip-bar">
          <span className="active-date-label">Filtered by date: <strong>{dateFilter}</strong></span>
          <button className="text-link" onClick={() => setDateFilter?.('')}>Clear date filter</button>
        </div>
      )}

      {selectedTransactions.length > 0 && (
        <div className="bulk-actions-bar">
          <span>{selectedTransactions.length} selected</span>
          <select 
            value={bulkCategory} 
            onChange={(e) => setBulkCategory(e.target.value)}
            className="bulk-select"
          >
            <option value="">Set category ▾</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button className="button button-primary compact" onClick={applyBulkCategory} disabled={!bulkCategory}>
            Apply
          </button>
          <button className="button button-tertiary compact" onClick={() => setSelectedTransactionIds([])}>
            Clear
          </button>
        </div>
      )}

      <div className="table-wrap desktop-ledger-table">
        <table className="data-table">
          <thead>
            <tr>
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="Select all transactions"
                />
              </th>
              <th>Date</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Source</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 empty-text">
                  No transactions match these filters.{' '}
                  <button className="text-link" onClick={() => {
                    setSearch('')
                    setCategoryFilter('All')
                    setSourceFilter('All')
                    setTypeFilter('All')
                    setDateFilter?.('')
                  }}>Clear filters</button>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => {
                const isLowConfidence = transaction.confidenceLabel !== 'high' || transaction.category === 'Uncategorized'
                const sign = transaction.type === 'debit' ? '−' : '+'
                return (
                  <tr key={transaction.id}>
                    <td className="th-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTransactionIds.includes(transaction.id)}
                        onChange={() => toggleSelectedTransaction(transaction.id)}
                        aria-label={`Select transaction from ${transaction.vendor || transaction.description}`}
                      />
                    </td>
                    <td className="mono muted text-xs nowrap">
                      {formatTransactionDateTime(transaction.date, transaction.time)}
                    </td>
                    <td>
                      <div className="merchant-cell" title={`${transaction.accountHint || ''} ${transaction.referenceId || ''}`}>
                        {transaction.vendor || transaction.description}
                      </div>
                    </td>
                    <td className="category-cell">
                      {isLowConfidence && <span className="amber-dot" title="Auto-categorized, low confidence"></span>}
                      <select 
                        value={transaction.category !== 'Uncategorized' ? transaction.category : ''}
                        onChange={(e) => onInlineApplyRule(transaction, e.target.value)}
                        className={`inline-select ${transaction.category === 'Uncategorized' ? 'uncategorized' : ''}`}
                      >
                        <option value="">Uncategorized</option>
                        {availableCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="muted text-xs">{transaction.source}</td>
                    <td className={`text-right mono ${transaction.type}`}>
                      {sign}{formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mobile-ledger-list">
        {filteredTransactions.length === 0 ? (
          <div className="text-center p-8 empty-text">No transactions match these filters.</div>
        ) : (
          filteredTransactions.map((transaction) => {
            const sign = transaction.type === 'debit' ? '−' : '+'
            const shortSource = transaction.source === 'Google Pay' ? 'GPay' : transaction.source
            return (
              <div className="mobile-row" key={transaction.id}>
                <div className="mobile-row-top">
                  <span className="mobile-merchant" title={transaction.vendor || transaction.description}>
                    {transaction.vendor || transaction.description}
                  </span>
                  <span className={`mobile-amount mono ${transaction.type}`}>
                    {sign}{formatCurrency(transaction.amount)}
                  </span>
                </div>
                <div className="mobile-row-bottom">
                  <span className="mobile-meta">
                    {formatTransactionDateTime(transaction.date, transaction.time)} · {shortSource}
                  </span>
                  <div className="category-chip-wrap">
                    <span 
                      className={`category-chip-text ${transaction.category === 'Uncategorized' ? 'uncategorized' : ''}`}
                      title={transaction.category}
                    >
                      {transaction.category} ▾
                    </span>
                    <select 
                      value={transaction.category !== 'Uncategorized' ? transaction.category : ''}
                      onChange={(e) => onInlineApplyRule(transaction, e.target.value)}
                      className="category-chip-select-overlay"
                      aria-label={`Change category for ${transaction.vendor || transaction.description}`}
                    >
                      <option value="">Uncategorized</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
