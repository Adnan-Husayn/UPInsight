import { useState } from 'react'
import { formatCurrency, type SavingsForecast } from '../../lib/analyzer'
import type { SavingsGoal } from '../../lib/types'

interface GoalTrackerProps {
  goal: SavingsGoal | null
  forecast: SavingsForecast | null
  onSaveGoal: (goal: SavingsGoal) => void
  onClearGoal: () => void
}

export function GoalTracker({
  goal,
  forecast,
  onSaveGoal,
  onClearGoal,
}: GoalTrackerProps) {
  const [name, setName] = useState(goal?.name ?? 'Savings goal')
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount ? String(goal.targetAmount) : '')
  const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount ? String(goal.currentAmount) : '')

  const handleSave = () => {
    const target = Number.parseFloat(targetAmount)
    const current = Number.parseFloat(currentAmount || '0')

    if (!name.trim() || Number.isNaN(target) || target <= 0 || Number.isNaN(current) || current < 0) {
      return
    }

    onSaveGoal({
      name: name.trim(),
      targetAmount: target,
      currentAmount: current,
    })
  }

  return (
    <section className="panel goal-tracker-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Goal tracking</p>
          <h2>Forecast your savings pace</h2>
        </div>
      </div>

      <div className="rules-form">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Goal name" />
        <input
          value={targetAmount}
          onChange={(event) => setTargetAmount(event.target.value)}
          placeholder="Target amount"
          inputMode="decimal"
        />
        <input
          value={currentAmount}
          onChange={(event) => setCurrentAmount(event.target.value)}
          placeholder="Current saved amount"
          inputMode="decimal"
        />
      </div>

      <div className="goal-actions">
        <button className="button button-primary compact" onClick={handleSave}>
          Save goal
        </button>
        <button className="button button-tertiary compact" onClick={onClearGoal} disabled={!goal}>
          Clear goal
        </button>
      </div>

      {forecast ? (
        <div className="goal-forecast-card">
          <div className="goal-forecast-top">
            <div>
              <strong>{forecast.goalName}</strong>
              <span className={`meta-chip ${
                forecast.paceLabel === 'off-track'
                  ? 'low'
                  : forecast.paceLabel === 'on-track' || forecast.paceLabel === 'complete'
                    ? 'high'
                    : 'medium'
              }`}>
                {forecast.paceLabel.replace('-', ' ')}
              </span>
            </div>
            <strong>{Math.round(forecast.progress * 100)}%</strong>
          </div>
          <div className="budget-track">
            <div className="budget-fill" style={{ width: `${Math.min(forecast.progress * 100, 100)}%` }}></div>
          </div>
          <div className="goal-forecast-grid">
            <div>
              <span>Saved so far</span>
              <strong>{formatCurrency(forecast.currentAmount)}</strong>
            </div>
            <div>
              <span>Remaining</span>
              <strong>{formatCurrency(forecast.remaining)}</strong>
            </div>
            <div>
              <span>Monthly net pace</span>
              <strong>{formatCurrency(forecast.averageMonthlyNet)}</strong>
            </div>
            <div>
              <span>Forecast</span>
              <strong>{forecast.estimatedCompletion}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state-block">
          <p className="empty-text">Save a goal to estimate your pace.</p>
          <div className="empty-preview-list">
            <span>Emergency fund</span>
            <span>Tax reserve</span>
          </div>
        </div>
      )}
    </section>
  )
}
