import { ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatCurrency } from '../../lib/analyzer'

export function MetricCard({
  label,
  value,
  accent,
  onClick,
}: {
  label: string
  value: string
  accent: 'sand' | 'sky' | 'mint' | 'rose' | 'ink'
  onClick?: () => void
}) {
  return (
    <motion.button
      type="button"
      className={`metric-card ${accent} ${onClick ? 'interactive-card' : ''}`}
      whileHover={onClick ? { y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      onClick={onClick}
      aria-label={onClick ? `${label}: ${value}. Opens matching ledger results.` : undefined}
    >
      <div className="metric-card-copy">
        <span className="metric-card-label">{label}</span>
        <strong className="metric-card-value">{value}</strong>
      </div>
      {onClick ? (
        <span className="drilldown-hint">
          Open ledger
          <ArrowUpRight size={14} strokeWidth={2} />
        </span>
      ) : null}
    </motion.button>
  )
}

interface MetricGridProps {
  statementsCount: number
  transactionCount: number
  totalIncome: number
  totalExpense: number
  net: number
  onCardClick?: (card: 'statements' | 'transactions' | 'income' | 'expense' | 'net') => void
}

export function MetricGrid({
  statementsCount,
  transactionCount,
  totalIncome,
  totalExpense,
  net,
  onCardClick,
}: MetricGridProps) {
  return (
    <section className="summary-grid">
      <MetricCard label="Statements" value={String(statementsCount)} accent="sand" onClick={() => onCardClick?.('statements')} />
      <MetricCard label="Transactions" value={String(transactionCount)} accent="sky" onClick={() => onCardClick?.('transactions')} />
      <MetricCard label="Total income" value={formatCurrency(totalIncome)} accent="mint" onClick={() => onCardClick?.('income')} />
      <MetricCard label="Total expenses" value={formatCurrency(totalExpense)} accent="rose" onClick={() => onCardClick?.('expense')} />
      <MetricCard label="Net change" value={formatCurrency(net)} accent="ink" onClick={() => onCardClick?.('net')} />
    </section>
  )
}
