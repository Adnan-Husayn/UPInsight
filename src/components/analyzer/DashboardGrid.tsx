import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatStatementDate } from '../../lib/analyzer'

interface DashboardGridProps {
  categories: Array<{ category: string; amount: number }>
  totalExpense: number
  trendMode: 'date' | 'day' | 'month'
  setTrendMode: (mode: 'date' | 'day' | 'month') => void
  trend: Array<{ label: string; amount: number; ratio: number }>
  trendPage: number
  trendPageSize: number
  setTrendPage: (updater: (current: number) => number) => void
  trendPageCount: number
  pagedTrend: Array<{ label: string; amount: number; ratio: number }>
  dashboardSource: string
  setDashboardSource: (source: string) => void
  sourceOptions: string[]
  onCategorySelect?: (category: string) => void
  onTrendSelect?: (label: string, mode: 'date' | 'day' | 'month') => void
}

const chartPalette = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

const CustomTooltipP = ({ active, payload }: { active?: boolean, payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--panel)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--ink)' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{payload[0].name}</p>
        <p style={{ margin: 0, color: 'var(--muted)' }}>{formatCurrency(payload[0].value)}</p>
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
  trendPage,
  trendPageSize,
  setTrendPage,
  trendPageCount,
  pagedTrend,
  dashboardSource,
  setDashboardSource,
  sourceOptions,
  onCategorySelect,
  onTrendSelect,
}: DashboardGridProps) {
  const pieData = useMemo(() => {
    return categories.map((cat, index) => ({
      name: cat.category,
      value: cat.amount,
      fill: chartPalette[index % chartPalette.length],
    }))
  }, [categories])

  const barData = useMemo(() => {
    return pagedTrend.map((item) => ({
      name: trendMode === 'date' ? formatStatementDate(item.label) : item.label,
      originalLabel: item.label,
      value: item.amount,
    }))
  }, [pagedTrend, trendMode])

  return (
    <div className="dashboard-grid">
      <div className="panel">
        <div className="panel-header panel-header-split">
          <div>
            <p className="panel-kicker">Category split</p>
            <h2>Expense distribution</h2>
          </div>
          <select 
            value={dashboardSource} 
            onChange={(e) => setDashboardSource(e.target.value)}
            className="compact-select"
          >
            {sourceOptions.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'All Platforms' : opt}</option>)}
          </select>
        </div>
        <div className="donut-layout">
          <div style={{ width: 280, height: 280, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.length > 0 ? pieData : [{ name: 'Empty', value: 1, fill: 'var(--surface-strong)' }]}
                  innerRadius={100}
                  outerRadius={140}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  onClick={(entry) => {
                    if ('name' in entry && typeof entry.name === 'string') {
                      onCategorySelect?.(entry.name)
                    }
                  }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} cursor={onCategorySelect ? 'pointer' : 'default'} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltipP />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--muted)', fontFamily: 'var(--ui)' }}>Total spend</span>
              <strong style={{ fontSize: '1.2rem', fontFamily: 'var(--ui)' }}>{formatCurrency(totalExpense)}</strong>
            </div>
          </div>
          <div className="legend-list">
            {categories.length === 0 ? (
              <div className="empty-state-block">
                <p className="empty-text">Category totals appear after import.</p>
                <div className="empty-preview-list">
                  <span>Food split</span>
                  <span>Bill payments</span>
                </div>
              </div>
            ) : (
              categories.slice(0, 6).map((item, index) => (
                <button
                  type="button"
                  className="legend-item interactive-list-item"
                  key={item.category}
                  onClick={() => onCategorySelect?.(item.category)}
                  aria-label={`${item.category}, ${formatCurrency(item.amount)}. Opens matching ledger rows.`}
                >
                  <div className="category-bar-wrapper">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="legend-color"
                        style={{ backgroundColor: chartPalette[index % chartPalette.length], display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%' }}
                      ></span>
                      <span>{item.category}</span>
                    </div>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                  <div className="category-bar-track">
                    <div 
                      className="category-bar-fill" 
                      style={{ 
                        width: `${Math.min((item.amount / totalExpense) * 100, 100)}%`,
                        backgroundColor: chartPalette[index % chartPalette.length] 
                      }} 
                    />
                  </div>
                  <span className="drilldown-hint">Open ledger</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Trend analysis</p>
            <h2>Spending by date, day, and month</h2>
          </div>
          <div className="segmented-control">
            <button
              className={`segment ${trendMode === 'date' ? 'active' : ''}`}
              onClick={() => {
                setTrendMode('date')
                setTrendPage(() => 0)
              }}
            >
              Date
            </button>
            <button
              className={`segment ${trendMode === 'day' ? 'active' : ''}`}
              onClick={() => {
                setTrendMode('day')
                setTrendPage(() => 0)
              }}
            >
              Day
            </button>
            <button
              className={`segment ${trendMode === 'month' ? 'active' : ''}`}
              onClick={() => {
                setTrendMode('month')
                setTrendPage(() => 0)
              }}
            >
              Month
            </button>
          </div>
        </div>
        <div className="trend-toolbar">
          <span>
            View {Math.min(trendPage * trendPageSize + 1, trend.length || 1)}-
            {Math.min((trendPage + 1) * trendPageSize, trend.length)} of {trend.length}
          </span>
          <div className="pager-actions">
            <button
              className="button button-tertiary compact"
              onClick={() => setTrendPage((current) => Math.max(current - 1, 0))}
              disabled={trendPage === 0}
            >
              Previous
            </button>
            <button
              className="button button-tertiary compact"
              onClick={() => setTrendPage((current) => Math.min(current + 1, trendPageCount - 1))}
              disabled={trendPage >= trendPageCount - 1}
            >
              Next
            </button>
          </div>
        </div>
        <div style={{ height: 300, marginTop: 24 }}>
          {trend.length === 0 ? (
            <div className="empty-state-block">
              <p className="empty-text">Trend data appears after import.</p>
              <div className="empty-preview-list">
                <span>Daily spikes</span>
                <span>Monthly totals</span>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'var(--ui)' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                  tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'var(--ui)' }} 
                  width={80}
                />
                <RechartsTooltip content={<CustomTooltipP />} cursor={{ fill: 'var(--panel)', opacity: 0.5 }} />
                <Bar
                  dataKey="value"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
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
