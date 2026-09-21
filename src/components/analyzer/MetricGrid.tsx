import { formatCurrency } from '../../lib/analyzer'

interface MetricGridProps {
  statementsCount: number
  transactionCount: number
  totalIncome: number
  totalExpense: number
  net: number
  recurringCount: number
}

export function MetricGrid({
  transactionCount,
  totalIncome,
  totalExpense,
  net,
  recurringCount,
}: MetricGridProps) {
  return (
    <section className="kpi-strip">
      <div className="kpi-item">
        <span className="kpi-label">Spent</span>
        <strong className="kpi-value mono">{formatCurrency(totalExpense)}</strong>
      </div>
      <div className="kpi-item">
        <span className="kpi-label">Received</span>
        <strong className="kpi-value mono credit">{formatCurrency(totalIncome)}</strong>
      </div>
      <div className="kpi-item">
        <span className="kpi-label">Net</span>
        <strong className={`kpi-value mono ${net >= 0 ? 'credit' : 'debit'}`}>{formatCurrency(net)}</strong>
      </div>
      <div className="kpi-item">
        <span className="kpi-label">Transactions</span>
        <strong className="kpi-value mono">{transactionCount}</strong>
      </div>
      <div className="kpi-item">
        <span className="kpi-label">Recurring</span>
        <strong className="kpi-value mono">{recurringCount}</strong>
      </div>
    </section>
  )
}
