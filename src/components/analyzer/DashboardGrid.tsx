import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatStatementDate } from '../../lib/analyzer'

interface DashboardGridProps {
  categories: Array<{ category: string; amount: number }>
  totalExpense: number
  trendMode: 'date' | 'day' | 'month'
  setTrendMode: (mode: 'date' | 'day' | 'month') => void
  trend: Array<{ label: string; amount: number; ratio: number }>
  onCategorySelect?: (category: string) => void
  onTrendSelect?: (label: string, mode: 'date' | 'day' | 'month') => void
  trendPage?: number
  trendPageSize?: number
  setTrendPage?: any
  trendPageCount?: number
  pagedTrend?: any
  dashboardSource?: string
  setDashboardSource?: any
  sourceOptions?: string[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value mono">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export function DashboardGrid({
  categories,
  totalExpense,
  trendMode,
  setTrendMode,
  trend,
  onCategorySelect,
  onTrendSelect,
}: DashboardGridProps) {
  const barData = useMemo(() => {
    return trend.map((item) => ({
      name: trendMode === 'date' ? formatStatementDate(item.label) : item.label,
      originalLabel: item.label,
      value: item.amount,
    }))
  }, [trend, trendMode])

  return (
    <div className="two-column-row">
      <div className="panel category-panel">
        <h3>Spending by category</h3>
        <div className="category-list">
          {categories.length === 0 ? (
            <p className="empty-text">No data to display.</p>
          ) : (
            categories.slice(0, 8).map((item, index) => {
              const percentage = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0
              return (
                <div 
                  key={item.category} 
                  className="category-row"
                  onClick={() => onCategorySelect?.(item.category)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="category-row-header">
                    <span className="category-name" title={item.category}>{item.category}</span>
                    <span className="category-value mono">{formatCurrency(item.amount)}</span>
                    <span className="category-percent mono">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="category-track">
                    <div 
                      className={`category-fill bg-chart-${(index % 6) + 1}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="panel trend-panel">
        <div className="trend-header">
          <h3>Spending over time</h3>
          <div className="segmented-control">
            <button
              className={`segment ${trendMode === 'date' ? 'active' : ''}`}
              onClick={() => setTrendMode('date')}
            >
              Day
            </button>
            <button
              className={`segment ${trendMode === 'day' ? 'active' : ''}`}
              onClick={() => setTrendMode('day')}
            >
              By weekday
            </button>
            <button
              className={`segment ${trendMode === 'month' ? 'active' : ''}`}
              onClick={() => setTrendMode('month')}
            >
              Month
            </button>
          </div>
        </div>
        <div className="chart-container">
          {trend.length === 0 ? (
            <p className="empty-text">No data to display.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--ui)' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--ui)' }}
                  tickFormatter={(val) => {
                    if (val === 0) return '₹0'
                    if (val >= 1000) {
                      const k = val / 1000
                      const formattedK = Number.isInteger(k) ? k.toString() : k.toFixed(1)
                      return `₹${formattedK}k`
                    }
                    return `₹${val}`
                  }}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
                <Bar
                  dataKey="value"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                  onClick={(state) => {
                    const label = state?.payload?.originalLabel
                    if (typeof label === 'string') {
                      onTrendSelect?.(label, trendMode)
                    }
                  }}
                  cursor={onTrendSelect ? 'pointer' : 'default'}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
