export type TransactionType = 'credit' | 'debit'
export type ConfidenceLabel = 'high' | 'medium' | 'low'
export type RecurringCadence = 'weekly' | 'monthly' | 'irregular'
export type WorkspaceName = 'Personal' | 'Business' | 'Family'
export type SavingsGoal = {
  name: string
  targetAmount: number
  currentAmount: number
}

export type Transaction = {
  id: string
  source: string
  date: string
  time: string
  description: string
  vendor: string
  category: string
  type: TransactionType
  amount: number
  referenceId: string
  utr: string
  accountHint: string
  rawBlock: string
  confidence: number
  confidenceLabel: ConfidenceLabel
  reviewReasons: string[]
  duplicateKey: string
  isDuplicate: boolean
  recurringKey: string
  recurringCadence: RecurringCadence | ''
  recurringCount: number
}

export type CategoryRule = {
  keyword: string
  category: string
}

export const DEFAULT_RULES: CategoryRule[] = [
  { keyword: 'swiggy', category: 'Food & Dining' },
  { keyword: 'zomato', category: 'Food & Dining' },
  { keyword: 'vodafone', category: 'Bills & Utilities' },
  { keyword: 'credit card', category: 'Credit Card Payments' },
  { keyword: 'bill payment', category: 'Bills & Utilities' },
  { keyword: 'electricity', category: 'Bills & Utilities' },
  { keyword: 'water', category: 'Bills & Utilities' },
  { keyword: 'fuel', category: 'Fuel & Travel' },
  { keyword: 'uber', category: 'Fuel & Travel' },
  { keyword: 'ola', category: 'Fuel & Travel' },
  { keyword: 'amazon', category: 'Shopping' },
  { keyword: 'flipkart', category: 'Shopping' },
  { keyword: 'netflix', category: 'Entertainment' },
  { keyword: 'spotify', category: 'Entertainment' },
  { keyword: 'received from', category: 'Incoming Transfers' },
  { keyword: 'salary', category: 'Income' },
]
