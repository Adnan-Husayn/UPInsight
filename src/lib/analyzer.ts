import type {
  CategoryRule,
  ConfidenceLabel,
  RecurringCadence,
  SavingsGoal,
  Transaction,
  TransactionType,
} from './types'
import Fuse from 'fuse.js'

const monthMap = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
} as const

type ParsedBlock = {
  date: string
  time: string
  body: string[]
}

type TypeInference = {
  type: TransactionType
  evidence: 'explicit' | 'strong' | 'weak'
}

export type DuplicateGroup = {
  key: string
  keptId: string
  count: number
  transactions: Transaction[]
}

export type RecurringInsight = {
  key: string
  vendor: string
  amount: number
  cadence: RecurringCadence
  count: number
  lastDate: string
  source: string
}

export type LedgerQueryInterpretation = {
  raw: string
  textTerms: string[]
  recognizedFilters: string[]
  category: string
  source: string
  type: TransactionType | ''
  minAmount: number | null
  maxAmount: number | null
  month: number | null
  onlyRefunds: boolean
  onlySalary: boolean
  hasNaturalLanguage: boolean
}

export type MonthlyNarrative = {
  month: string
  title: string
  bullets: string[]
}

export type CashflowMarker = {
  id: string
  date: string
  kind: 'salary' | 'refund' | 'spike'
  label: string
  detail: string
  amount: number
  type: TransactionType
}

export type SavingsForecast = {
  goalName: string
  currentAmount: number
  targetAmount: number
  progress: number
  remaining: number
  averageMonthlyNet: number
  estimatedMonths: number | null
  estimatedCompletion: string
  paceLabel: 'complete' | 'on-track' | 'steady' | 'off-track'
}

export type StatementHealthIssue = {
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
}

export type StatementHealthReport = {
  score: number
  issues: StatementHealthIssue[]
  pageCount: number
  ocrPages: number
  emptyPages: number
  malformedCount: number
}

export type StatementDocumentInput = {
  fileName: string
  text: string
  pageCount?: number
  ocrPages?: number
  emptyPages?: number
}

const fallbackDate = '1970-01-01'
const queryStopWords = new Set([
  'show',
  'me',
  'my',
  'all',
  'the',
  'for',
  'from',
  'with',
  'and',
  'or',
  'in',
  'on',
  'of',
  'above',
  'below',
  'under',
  'over',
  'greater',
  'less',
  'than',
  'more',
  'transactions',
  'transaction',
  'spending',
  'spend',
  'spent',
  'expense',
  'expenses',
  'credits',
  'credit',
  'debits',
  'debit',
  'where',
  'that',
  'this',
  'month',
])
const monthAliases = [
  ['january', 'jan'],
  ['february', 'feb'],
  ['march', 'mar'],
  ['april', 'apr'],
  ['may'],
  ['june', 'jun'],
  ['july', 'jul'],
  ['august', 'aug'],
  ['september', 'sep', 'sept'],
  ['october', 'oct'],
  ['november', 'nov'],
  ['december', 'dec'],
] as const
const ledgerCsvHeader = [
  'date',
  'time',
  'source',
  'type',
  'amount',
  'category',
  'description',
  'vendor',
  'reference_id',
  'utr',
  'account_hint',
] as const
const smartCategoryKnowledge = [
  { category: 'Food & Dining', keywords: ['restaurant', 'cafe', 'swiggy', 'zomato', 'eatclub', 'biryani', 'pizza'] },
  { category: 'Bills & Utilities', keywords: ['electricity', 'vodafone', 'jio', 'airtel', 'bill', 'broadband', 'recharge'] },
  { category: 'Credit Card Payments', keywords: ['credit card', 'card bill', 'bill payment', 'cc payment'] },
  { category: 'Fuel & Travel', keywords: ['uber', 'ola', 'fuel', 'petrol', 'diesel', 'metro', 'irctc'] },
  { category: 'Shopping', keywords: ['amazon', 'flipkart', 'myntra', 'meesho', 'store', 'mart'] },
  { category: 'Entertainment', keywords: ['netflix', 'spotify', 'bookmyshow', 'movie', 'prime'] },
  { category: 'Healthcare', keywords: ['apollo', 'hospital', 'clinic', 'pharmacy', 'medical'] },
  { category: 'Income', keywords: ['salary', 'refund', 'credited', 'bonus'] },
]
const categoryAliasMap: Record<string, string[]> = {
  'Food & Dining': ['food', 'dining', 'restaurant', 'groceries', 'grocery'],
  'Bills & Utilities': ['bill', 'bills', 'utility', 'utilities', 'recharge'],
  'Credit Card Payments': ['credit card', 'card bill', 'card payment'],
  'Fuel & Travel': ['travel', 'fuel', 'transport', 'cab'],
  Shopping: ['shopping', 'shop', 'store'],
  Entertainment: ['entertainment', 'movies', 'subscriptions'],
  Healthcare: ['health', 'medical', 'pharmacy'],
  Income: ['income', 'salary', 'bonus'],
  'Incoming Transfers': ['transfers', 'incoming', 'received'],
}

export function parseDocuments(
  documents: Array<{ fileName: string; text: string }>,
  rules: CategoryRule[],
) {
  const merged = documents.flatMap((document) => {
    try {
      return parseSingleDocument(document.fileName, document.text, rules)
    } catch {
      return []
    }
  })

  return merged.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
}

function parseSingleDocument(fileName: string, text: string, rules: CategoryRule[]): Transaction[] {
  const lines = normalizeLines(text)
  const source = detectSource(fileName, text)
  const blocks = splitIntoBlocks(lines)

  return blocks
    .map((block, index) => buildTransaction(block, source, rules, index, fileName))
    .filter((transaction): transaction is Transaction => transaction !== null)
}

function buildTransaction(
  block: ParsedBlock,
  source: string,
  rules: CategoryRule[],
  index: number,
  fileName: string,
) {
  const bodyText = block.body.join(' | ')
  const description =
    block.body.find((line) => {
      const lowered = line.toLowerCase()
      return (
        !lowered.includes('transaction id') &&
        !lowered.includes('utr') &&
        !lowered.includes('debited from') &&
        !lowered.includes('paid by') &&
        !/^(debit|credit)$/i.test(line) &&
        !hasCurrency(line)
      )
    }) || 'Unlabeled transaction'

  const amount = extractAmount(block.body)
  if (amount === null) {
    return null
  }

  const referenceId = findFirst(block.body, [
    /(?:UPI\s+)?Transaction ID\s*:?\s*([A-Z0-9]+)/i,
    /Txn ID\s*:?\s*([A-Z0-9]+)/i,
  ])
  const utr = findFirst(block.body, [/UTR(?: No)?\s*:?\s*([A-Z0-9]+)/i])
  const accountHint =
    block.body.find((line) =>
      /(debited from|paid by|credited to|bank|account|xx\d{2,4})/i.test(line),
    ) || ''

  const typeResult = inferType(description, block.body, bodyText)
  const type = typeResult.type
  const vendor = deriveVendor(description)
  const category = categorize(`${description} ${vendor} ${accountHint}`, vendor, type, rules)
  const confidence = assessTransactionConfidence({
    date: block.date,
    time: block.time,
    description,
    referenceId,
    utr,
    accountHint,
    category,
    typeEvidence: typeResult.evidence,
  })

  const duplicateKey = buildDuplicateKey({
    date: block.date,
    type,
    amount,
    vendor,
    description,
    referenceId,
    utr,
  })

  return {
    id: `${fileName}-${index}-${referenceId || utr || amount}`,
    source,
    date: block.date,
    time: block.time,
    description,
    vendor,
    category,
    type,
    amount,
    referenceId,
    utr,
    accountHint,
    rawBlock: [block.date, block.time, ...block.body].join('\n'),
    confidence: confidence.score,
    confidenceLabel: confidence.label,
    reviewReasons: confidence.reasons,
    duplicateKey,
    isDuplicate: false,
    recurringKey: '',
    recurringCadence: '',
    recurringCount: 0,
  }
}

function splitIntoBlocks(lines: string[]): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  let current: ParsedBlock | null = null

  for (const line of lines) {
    const dateTime = extractDateTime(line)

    if (dateTime) {
      if (current && current.body.length > 0) {
        blocks.push(current)
      }

      current = {
        date: dateTime.date,
        time: dateTime.time,
        body: [],
      }

      continue
    }

    if (!current) {
      continue
    }

    if (!current.time && isTimeLine(line)) {
      current.time = line.toUpperCase()
      continue
    }

    current.body.push(line)
  }

  if (current && current.body.length > 0) {
    blocks.push(current)
  }

  return blocks
}

function normalizeLines(text: string) {
  return text
    .replaceAll('\r', '\n')
    .split('\n')
    .flatMap((line) =>
      line
        .replace(/\u00a0/g, ' ')
        .split(/ {3,}|\t+/)
        .map((segment) => segment.replace(/\s+/g, ' ').trim()),
    )
    .filter((line) => {
      if (!line) {
        return false
      }

      if (/transaction statement/i.test(line) || /statement for/i.test(line)) {
        return false
      }

      if (/^date( & time)?$/i.test(line) || /^transaction details$/i.test(line)) {
        return false
      }

      return true
    })
}

function detectSource(fileName: string, text: string) {
  const sample = `${fileName} ${text}`.toLowerCase()

  if (sample.includes('google pay') || sample.includes('gpay')) {
    return 'Google Pay'
  }

  if (sample.includes('phonepe') || sample.includes('transaction statement for +91')) {
    return 'PhonePe'
  }

  return 'UPI Statement'
}

function normalizeDate(line: string) {
  const slashMatch = line.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (slashMatch) {
    const [, dayRaw, monthRaw, yearRaw] = slashMatch
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
    return `${year}-${monthRaw.padStart(2, '0')}-${dayRaw.padStart(2, '0')}`
  }

  const raw = line.replace(',', '').split(' ')

  if (/^[A-Za-z]{3}$/i.test(raw[0])) {
    const month = monthMap[raw[0].toLowerCase() as keyof typeof monthMap]
    if (!month || !raw[1] || !raw[2]) {
      return fallbackDate
    }
    const day = raw[1].padStart(2, '0')
    const year = raw[2]
    return `${year}-${month}-${day}`
  }

  if (!raw[0] || !raw[1] || !raw[2]) {
    return fallbackDate
  }

  const day = raw[0].padStart(2, '0')
  const month = monthMap[raw[1].toLowerCase() as keyof typeof monthMap]
  if (!month) {
    return fallbackDate
  }
  const year = raw[2]
  return `${year}-${month}-${day}`
}

function isTimeLine(line: string) {
  return /^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(line)
}

function hasCurrency(line: string) {
  return /(?:INR|Rs\.?|₹)\s?\d[\d,]*\.?\d*/i.test(line)
}

function extractAmount(lines: string[]) {
  const candidates = lines
    .map((line) => {
      const match =
        line.match(/(?:INR|Rs\.?|₹)\s?([\d,]+(?:\.\d{1,2})?)/i) ||
        line.match(/^([\d,]+(?:\.\d{1,2})?)$/)
      return match ? Number.parseFloat(match[1].replaceAll(',', '')) : null
    })
    .filter((value): value is number => value !== null)

  if (candidates.length > 0) {
    return candidates.at(-1) ?? null
  }

  return null
}

function findFirst(lines: string[], patterns: RegExp[]) {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }
  }

  return ''
}

function inferType(description: string, bodyLines: string[], bodyText: string): TypeInference {
  const normalizedDescription = description.trim().toLowerCase()
  const normalizedLines = bodyLines.map((line) => line.trim().toLowerCase())
  const sample = `${normalizedDescription} ${bodyText}`.toLowerCase()

  const explicitTypeLine = normalizedLines.find((line) => /^(debit|credit)$/.test(line))
  if (explicitTypeLine === 'debit' || explicitTypeLine === 'credit') {
    return { type: explicitTypeLine, evidence: 'explicit' }
  }

  if (/^(paid to|bill paid -|bill paid|paid for|sent to)\b/.test(normalizedDescription)) {
    return { type: 'debit', evidence: 'strong' }
  }

  if (/^(received from|collected from)\b/.test(normalizedDescription)) {
    return { type: 'credit', evidence: 'strong' }
  }

  if (normalizedLines.some((line) => /\b(debited from|paid by|withdrawn from|sent to)\b/.test(line))) {
    return { type: 'debit', evidence: 'strong' }
  }

  if (normalizedLines.some((line) => /\b(credited to|credited in|received in|received by)\b/.test(line))) {
    return { type: 'credit', evidence: 'strong' }
  }

  if (/\b(received from|credited to|credited in|credited by|salary|bonus|cashback|refund)\b/.test(sample)) {
    return { type: 'credit', evidence: 'weak' }
  }

  if (/\b(paid to|debited from|paid by|bill paid|sent to|debit)\b/.test(sample)) {
    return { type: 'debit', evidence: 'weak' }
  }

  return { type: 'debit', evidence: 'weak' }
}

function deriveVendor(description: string) {
  return description
    .replace(/^(paid to|received from|bill paid -|bill paid|paid for)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function categorize(text: string, vendor: string, type: TransactionType, rules: CategoryRule[]) {
  const normalized = text.toLowerCase()
  const match = rules.find((rule) => normalized.includes(rule.keyword.toLowerCase()))

  if (match) {
    return match.category
  }

  if (rules.length > 0 && vendor) {
    const fuse = new Fuse(rules, {
      keys: ['keyword'],
      threshold: 0.35,
    })
    const results = fuse.search(vendor)
    if (results.length > 0) {
      return results[0].item.category
    }
  }

  const smartCategory = inferSmartCategory(normalized)
  if (smartCategory) {
    return smartCategory
  }

  return type === 'credit' ? 'Incoming Transfers' : 'Uncategorized'
}

function assessTransactionConfidence({
  date,
  time,
  description,
  referenceId,
  utr,
  accountHint,
  category,
  typeEvidence,
}: {
  date: string
  time: string
  description: string
  referenceId: string
  utr: string
  accountHint: string
  category: string
  typeEvidence: TypeInference['evidence']
}) {
  let score = 0.96
  const reasons: string[] = []

  if (date === fallbackDate) {
    score -= 0.32
    reasons.push('Date could not be parsed reliably')
  }

  if (!time) {
    score -= 0.06
    reasons.push('Time is missing from this entry')
  }

  if (description === 'Unlabeled transaction') {
    score -= 0.28
    reasons.push('Description text was not extracted clearly')
  }

  if (!referenceId && !utr) {
    score -= 0.12
    reasons.push('Reference identifiers are missing')
  }

  if (!accountHint) {
    score -= 0.06
    reasons.push('Account source hint is missing')
  }

  if (category === 'Uncategorized') {
    score -= 0.14
    reasons.push('Category still needs review')
  }

  if (typeEvidence === 'weak') {
    score -= 0.12
    reasons.push('Transaction direction was inferred from weak cues')
  }

  const normalized = Math.max(0.24, Math.min(0.99, Number(score.toFixed(2))))
  const label: ConfidenceLabel =
    normalized >= 0.84 ? 'high' : normalized >= 0.62 ? 'medium' : 'low'

  return {
    score: normalized,
    label,
    reasons,
  }
}

function normalizeIdentity(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function buildDuplicateKey({
  date,
  type,
  amount,
  vendor,
  description,
  referenceId,
  utr,
}: Pick<Transaction, 'date' | 'type' | 'amount' | 'vendor' | 'description' | 'referenceId' | 'utr'>) {
  const identifier = normalizeIdentity(referenceId || utr)

  if (identifier) {
    return `${type}:${amount.toFixed(2)}:${identifier}`
  }

  const identity = normalizeIdentity(vendor || description).slice(0, 48)
  return `${date}:${type}:${amount.toFixed(2)}:${identity || 'unknown'}`
}

export function mergeAndAnalyzeTransactions(transactions: Transaction[]) {
  const duplicateMap = new Map<string, Transaction[]>()

  for (const transaction of transactions) {
    const key = transaction.duplicateKey || buildDuplicateKey(transaction)
    const group = duplicateMap.get(key)
    if (group) {
      group.push(transaction)
    } else {
      duplicateMap.set(key, [transaction])
    }
  }

  const recurringInsights = detectRecurringPayments(transactions)
  const recurringMap = new Map<string, RecurringInsight>()
  for (const insight of recurringInsights) {
    recurringMap.set(insight.key, insight)
  }

  const duplicateGroups: DuplicateGroup[] = []
  const dedupedTransactions: Transaction[] = []

  for (const group of duplicateMap.values()) {
    const orderedGroup = [...group].sort((first, second) =>
      `${second.date} ${second.time}`.localeCompare(`${first.date} ${first.time}`),
    )
    const kept = orderedGroup[0]

    if (orderedGroup.length > 1) {
      duplicateGroups.push({
        key: kept.duplicateKey,
        keptId: kept.id,
        count: orderedGroup.length,
        transactions: orderedGroup,
      })
    }

    const recurring = recurringMap.get(buildRecurringKey(kept))
    dedupedTransactions.push({
      ...kept,
      confidence: kept.confidence ?? 0.99,
      confidenceLabel: kept.confidenceLabel ?? 'high',
      reviewReasons: kept.reviewReasons ?? [],
      duplicateKey: kept.duplicateKey || buildDuplicateKey(kept),
      isDuplicate: orderedGroup.length > 1,
      recurringKey: recurring?.key ?? '',
      recurringCadence: recurring?.cadence ?? '',
      recurringCount: recurring?.count ?? 0,
    })
  }

  return {
    transactions: dedupedTransactions.sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
    ),
    duplicateGroups: duplicateGroups.sort((a, b) => b.count - a.count),
    recurringInsights,
  }
}

export function summarizeDocuments(transactions: Transaction[]) {
  const totals = transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === 'credit') {
        summary.totalIncome += transaction.amount
      } else {
        summary.totalExpense += transaction.amount
      }

      summary.sources.add(transaction.source)
      return summary
    },
    { totalIncome: 0, totalExpense: 0, sources: new Set<string>() },
  )

  return {
    documentCount: totals.sources.size,
    transactionCount: transactions.length,
    totalIncome: totals.totalIncome,
    totalExpense: totals.totalExpense,
    net: totals.totalIncome - totals.totalExpense,
  }
}

export function categoryTotals(transactions: Transaction[]) {
  const map = new Map<string, number>()

  for (const transaction of transactions) {
    if (transaction.type !== 'debit') {
      continue
    }

    map.set(transaction.category, (map.get(transaction.category) ?? 0) + transaction.amount)
  }

  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function dailyExpenseTrend(transactions: Transaction[]) {
  const map = new Map<string, number>()

  for (const transaction of transactions) {
    if (transaction.type !== 'debit') {
      continue
    }

    map.set(transaction.date, (map.get(transaction.date) ?? 0) + transaction.amount)
  }

  const rows = [...map.entries()]
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const max = Math.max(...rows.map((row) => row.amount), 1)
  return rows.map((row) => ({ ...row, ratio: row.amount / max }))
}

export function spendingByPeriod(
  transactions: Transaction[],
  mode: 'date' | 'day' | 'month',
) {
  const map = new Map<string, number>()

  for (const transaction of transactions) {
    if (transaction.type !== 'debit') {
      continue
    }

    const key = periodKey(transaction.date, mode)
    map.set(key, (map.get(key) ?? 0) + transaction.amount)
  }

  const rows = [...map.entries()].map(([label, amount]) => ({ label, amount }))
  const sorted = sortPeriodRows(rows, mode)
  const max = Math.max(...sorted.map((row) => row.amount), 1)

  return sorted.map((row) => ({ ...row, ratio: row.amount / max }))
}

export function topVendors(transactions: Transaction[]) {
  const map = new Map<string, number>()

  for (const transaction of transactions) {
    if (transaction.type !== 'debit') {
      continue
    }

    const key = transaction.vendor || 'Unknown vendor'
    map.set(key, (map.get(key) ?? 0) + transaction.amount)
  }

  const rows = [...map.entries()]
    .map(([vendor, amount]) => ({ vendor, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  const max = Math.max(...rows.map((row) => row.amount), 1)
  return rows.map((row) => ({ ...row, ratio: row.amount / max }))
}

export function detectRecurringPayments(transactions: Transaction[]) {
  const candidateGroups = new Map<string, Transaction[]>()

  for (const transaction of transactions) {
    if (transaction.type !== 'debit') {
      continue
    }

    const key = buildRecurringKey(transaction)
    if (!key) {
      continue
    }

    const group = candidateGroups.get(key)
    if (group) {
      group.push(transaction)
    } else {
      candidateGroups.set(key, [transaction])
    }
  }

  const recurring: RecurringInsight[] = []

  for (const [key, group] of candidateGroups.entries()) {
    const ordered = [...group].sort((first, second) => first.date.localeCompare(second.date))

    if (ordered.length < 2) {
      continue
    }

    const cadence = inferRecurringCadence(ordered)
    if (!cadence) {
      continue
    }

    recurring.push({
      key,
      vendor: ordered[0].vendor || ordered[0].description,
      amount: ordered[0].amount,
      cadence,
      count: ordered.length,
      lastDate: ordered.at(-1)?.date ?? '',
      source: ordered[0].source,
    })
  }

  return recurring.sort((first, second) => {
    if (second.count !== first.count) {
      return second.count - first.count
    }
    return second.lastDate.localeCompare(first.lastDate)
  })
}

export function interpretLedgerQuery(
  query: string,
  categories: string[],
  sources: string[],
): LedgerQueryInterpretation {
  const raw = query.trim()
  if (!raw) {
    return {
      raw,
      textTerms: [],
      recognizedFilters: [],
      category: '',
      source: '',
      type: '',
      minAmount: null,
      maxAmount: null,
      month: null,
      onlyRefunds: false,
      onlySalary: false,
      hasNaturalLanguage: false,
    }
  }

  let working = ` ${raw.toLowerCase()} `
  const recognizedFilters: string[] = []
  let category = ''
  let source = ''
  let type: TransactionType | '' = ''
  let minAmount: number | null = null
  let maxAmount: number | null = null
  let month: number | null = null
  let onlyRefunds = false
  let onlySalary = false

  const removePattern = (pattern: RegExp) => {
    working = working.replace(pattern, ' ')
  }

  const minMatch = working.match(/\b(?:above|over|greater than|more than)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\b/i)
  if (minMatch) {
    minAmount = Number.parseFloat(minMatch[1].replaceAll(',', ''))
    recognizedFilters.push(`Above ${formatCurrency(minAmount)}`)
    removePattern(minMatch[0] ? new RegExp(escapeRegExp(minMatch[0]), 'i') : /$^/)
  }

  const maxMatch = working.match(/\b(?:below|under|less than|upto|up to)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\b/i)
  if (maxMatch) {
    maxAmount = Number.parseFloat(maxMatch[1].replaceAll(',', ''))
    recognizedFilters.push(`Below ${formatCurrency(maxAmount)}`)
    removePattern(maxMatch[0] ? new RegExp(escapeRegExp(maxMatch[0]), 'i') : /$^/)
  }

  if (/\b(refund|refunds|cashback|reversal)\b/.test(working)) {
    onlyRefunds = true
    type = 'credit'
    recognizedFilters.push('Refunds')
    removePattern(/\b(refund|refunds|cashback|reversal)\b/g)
  }

  if (/\b(salary|bonus|payroll)\b/.test(working)) {
    onlySalary = true
    type = 'credit'
    recognizedFilters.push('Salary markers')
    removePattern(/\b(salary|bonus|payroll)\b/g)
  }

  if (!type && /\b(credit|credits|income|received|incoming)\b/.test(working)) {
    type = 'credit'
    recognizedFilters.push('Credits')
    removePattern(/\b(credit|credits|income|received|incoming)\b/g)
  } else if (!type && /\b(debit|debits|spending|spend|spent|expense|expenses|paid)\b/.test(working)) {
    type = 'debit'
    recognizedFilters.push('Debits')
    removePattern(/\b(debit|debits|spending|spend|spent|expense|expenses|paid)\b/g)
  }

  for (let index = 0; index < monthAliases.length; index += 1) {
    const aliasGroup = monthAliases[index]
    const aliasMatch = aliasGroup.find((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i').test(working))
    if (aliasMatch) {
      month = index
      recognizedFilters.push(aliasGroup[0].slice(0, 1).toUpperCase() + aliasGroup[0].slice(1))
      removePattern(new RegExp(`\\b${escapeRegExp(aliasMatch)}\\b`, 'ig'))
      break
    }
  }

  const categoryCandidates = categories
    .flatMap((candidate) => [candidate, ...(categoryAliasMap[candidate] ?? [])].map((alias) => ({ alias, category: candidate })))
    .sort((first, second) => second.alias.length - first.alias.length)
  const categoryMatch = categoryCandidates.find(({ alias }) =>
    new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`, 'i').test(working),
  )
  if (categoryMatch) {
    category = categoryMatch.category
    recognizedFilters.push(category)
    removePattern(new RegExp(`\\b${escapeRegExp(categoryMatch.alias.toLowerCase())}\\b`, 'ig'))
  }

  const sourceAliases = sources.flatMap((candidate) => {
    const aliases = [candidate.toLowerCase()]
    if (candidate === 'Google Pay') {
      aliases.push('gpay')
    }
    return aliases.map((alias) => ({ alias, source: candidate }))
  })
  const sourceMatch = sourceAliases.find(({ alias }) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i').test(working))
  if (sourceMatch) {
    source = sourceMatch.source
    recognizedFilters.push(source)
    removePattern(new RegExp(`\\b${escapeRegExp(sourceMatch.alias)}\\b`, 'ig'))
  }

  const textTerms = working
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !queryStopWords.has(token))

  return {
    raw,
    textTerms,
    recognizedFilters,
    category,
    source,
    type,
    minAmount,
    maxAmount,
    month,
    onlyRefunds,
    onlySalary,
    hasNaturalLanguage:
      recognizedFilters.length > 0 || minAmount !== null || maxAmount !== null || textTerms.length > 1,
  }
}

export function matchesLedgerQuery(transaction: Transaction, interpretation: LedgerQueryInterpretation) {
  if (interpretation.category && transaction.category !== interpretation.category) {
    return false
  }

  if (interpretation.source && transaction.source !== interpretation.source) {
    return false
  }

  if (interpretation.type && transaction.type !== interpretation.type) {
    return false
  }

  if (interpretation.minAmount !== null && transaction.amount < interpretation.minAmount) {
    return false
  }

  if (interpretation.maxAmount !== null && transaction.amount > interpretation.maxAmount) {
    return false
  }

  if (interpretation.month !== null) {
    const parsed = new Date(`${transaction.date}T00:00:00`)
    if (Number.isNaN(parsed.getTime()) || parsed.getMonth() !== interpretation.month) {
      return false
    }
  }

  if (interpretation.onlyRefunds && !isRefundTransaction(transaction)) {
    return false
  }

  if (interpretation.onlySalary && !isSalaryTransaction(transaction)) {
    return false
  }

  if (interpretation.textTerms.length > 0) {
    const haystack = [
      transaction.description,
      transaction.vendor,
      transaction.referenceId,
      transaction.accountHint,
      transaction.utr,
      transaction.category,
      transaction.source,
    ]
      .join(' ')
      .toLowerCase()

    return interpretation.textTerms.every((term) => haystack.includes(term))
  }

  return true
}

export function buildMonthlyNarratives(transactions: Transaction[]) {
  const monthMap = new Map<string, Transaction[]>()

  for (const transaction of transactions) {
    const monthKey = transaction.date.slice(0, 7)
    const bucket = monthMap.get(monthKey)
    if (bucket) {
      bucket.push(transaction)
    } else {
      monthMap.set(monthKey, [transaction])
    }
  }

  const orderedMonths = [...monthMap.keys()].sort((first, second) => second.localeCompare(first))
  return orderedMonths.slice(0, 3).map((monthKey, index) => {
    const monthTransactions = monthMap.get(monthKey) ?? []
    const previousTransactions = monthMap.get(orderedMonths[index + 1] ?? '') ?? []
    const income = monthTransactions
      .filter((transaction) => transaction.type === 'credit')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const expense = monthTransactions
      .filter((transaction) => transaction.type === 'debit')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const net = income - expense
    const topCategory = categoryTotals(monthTransactions)[0]
    const topVendor = topVendors(monthTransactions)[0]
    const refundTotal = monthTransactions
      .filter((transaction) => isRefundTransaction(transaction))
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const previousExpense = previousTransactions
      .filter((transaction) => transaction.type === 'debit')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const delta =
      previousExpense > 0 ? ((expense - previousExpense) / previousExpense) * 100 : null

    const monthDate = new Date(`${monthKey}-01T00:00:00`)
    const title = Number.isNaN(monthDate.getTime())
      ? monthKey
      : new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(monthDate)

    const bullets = [
      `${title} closed with ${net >= 0 ? 'a surplus' : 'a deficit'} of ${formatCurrency(Math.abs(net))}, on income of ${formatCurrency(income)} and expenses of ${formatCurrency(expense)}.`,
      topCategory
        ? `Top outflow was ${topCategory.category} at ${formatCurrency(topCategory.amount)}${topVendor ? `, led by ${topVendor.vendor}.` : '.'}`
        : 'No debit transactions were found in this month.',
      refundTotal > 0
        ? `Refunds and reversals added back ${formatCurrency(refundTotal)} this month.`
        : delta === null
          ? 'This is the first month in the current range, so there is no previous-month comparison yet.'
          : `Expenses ${delta >= 0 ? 'rose' : 'fell'} ${Math.abs(delta).toFixed(0)}% versus the previous month.`,
    ]

    return {
      month: monthKey,
      title,
      bullets,
    } satisfies MonthlyNarrative
  })
}

export function buildCashflowTimeline(transactions: Transaction[]) {
  const debitAmounts = transactions
    .filter((transaction) => transaction.type === 'debit')
    .map((transaction) => transaction.amount)
    .sort((first, second) => first - second)
  const spikeThreshold =
    debitAmounts.length >= 4
      ? debitAmounts[Math.max(Math.floor(debitAmounts.length * 0.9) - 1, 0)]
      : Math.max(...debitAmounts, 0)

  const events: CashflowMarker[] = []

  for (const transaction of transactions) {
    if (isSalaryTransaction(transaction)) {
      events.push({
        id: transaction.id,
        date: transaction.date,
        kind: 'salary',
        label: transaction.vendor || transaction.description,
        detail: `Salary marker from ${transaction.source}`,
        amount: transaction.amount,
        type: transaction.type,
      })
      continue
    }

    if (isRefundTransaction(transaction)) {
      events.push({
        id: transaction.id,
        date: transaction.date,
        kind: 'refund',
        label: transaction.vendor || transaction.description,
        detail: `Refund or reversal detected in ${transaction.source}`,
        amount: transaction.amount,
        type: transaction.type,
      })
      continue
    }

    if (
      transaction.type === 'debit' &&
      spikeThreshold > 0 &&
      transaction.amount >= spikeThreshold &&
      debitAmounts.length > 0
    ) {
      events.push({
        id: transaction.id,
        date: transaction.date,
        kind: 'spike',
        label: transaction.vendor || transaction.description,
        detail: `High-spend outflow flagged as a spike`,
        amount: transaction.amount,
        type: transaction.type,
      })
    }
  }

  return events
    .sort((first, second) => `${second.date} ${second.id}`.localeCompare(`${first.date} ${first.id}`))
    .slice(0, 12)
}

export function forecastSavingsGoal(
  transactions: Transaction[],
  goal: SavingsGoal | null,
): SavingsForecast | null {
  if (!goal || goal.targetAmount <= 0) {
    return null
  }

  const monthNetMap = new Map<string, number>()
  for (const transaction of transactions) {
    const key = transaction.date.slice(0, 7)
    const current = monthNetMap.get(key) ?? 0
    monthNetMap.set(key, current + (transaction.type === 'credit' ? transaction.amount : -transaction.amount))
  }

  const monthlyNets = [...monthNetMap.entries()]
    .sort((first, second) => first[0].localeCompare(second[0]))
    .slice(-6)
    .map(([, value]) => value)
  const averageMonthlyNet =
    monthlyNets.length > 0
      ? monthlyNets.reduce((sum, value) => sum + value, 0) / monthlyNets.length
      : 0
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)
  const progress = goal.targetAmount > 0 ? Math.min(goal.currentAmount / goal.targetAmount, 1) : 0
  const estimatedMonths = averageMonthlyNet > 0 ? Math.ceil(remaining / averageMonthlyNet) : null

  let estimatedCompletion = 'Forecast unavailable'
  if (estimatedMonths === 0) {
    estimatedCompletion = 'Goal reached'
  } else if (estimatedMonths !== null) {
    const latestDate = transactions.at(0)?.date ?? new Date().toISOString().slice(0, 10)
    const completionDate = new Date(`${latestDate}T00:00:00`)
    completionDate.setMonth(completionDate.getMonth() + estimatedMonths)
    estimatedCompletion = new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
    }).format(completionDate)
  }

  const paceLabel =
    remaining <= 0
      ? 'complete'
      : averageMonthlyNet <= 0
        ? 'off-track'
        : estimatedMonths !== null && estimatedMonths <= 6
          ? 'on-track'
          : 'steady'

  return {
    goalName: goal.name,
    currentAmount: goal.currentAmount,
    targetAmount: goal.targetAmount,
    progress,
    remaining,
    averageMonthlyNet,
    estimatedMonths,
    estimatedCompletion,
    paceLabel,
  }
}

export function analyzeStatementHealth(
  documents: StatementDocumentInput[],
  rawTransactions: Transaction[],
  duplicateGroups: DuplicateGroup[],
) {
  const issues: StatementHealthIssue[] = []
  const pageCount = documents.reduce((sum, document) => sum + (document.pageCount ?? 0), 0)
  const ocrPages = documents.reduce((sum, document) => sum + (document.ocrPages ?? 0), 0)
  const emptyPages = documents.reduce((sum, document) => sum + (document.emptyPages ?? 0), 0)
  const malformedCount = rawTransactions.filter(
    (transaction) =>
      transaction.date === fallbackDate ||
      transaction.description === 'Unlabeled transaction' ||
      (!transaction.referenceId && !transaction.utr && !transaction.accountHint),
  ).length
  const lowConfidenceCount = rawTransactions.filter((transaction) => transaction.confidenceLabel === 'low').length
  const mediumConfidenceCount = rawTransactions.filter((transaction) => transaction.confidenceLabel === 'medium').length

  if (emptyPages > 0) {
    issues.push({
      severity: 'critical',
      title: 'Possible missing or unreadable pages',
      detail: `${emptyPages} page${emptyPages === 1 ? '' : 's'} returned little or no text even after OCR. Verify the PDF export or scan quality.`,
    })
  }

  if (ocrPages > 0) {
    issues.push({
      severity: 'info',
      title: 'OCR fallback was used',
      detail: `${ocrPages} page${ocrPages === 1 ? '' : 's'} needed image-based text recognition.`,
    })
  }

  if (lowConfidenceCount > 0 || mediumConfidenceCount > 3) {
    issues.push({
      severity: lowConfidenceCount > 0 ? 'warning' : 'info',
      title: 'Parser confidence needs review',
      detail: `${lowConfidenceCount} low-confidence and ${mediumConfidenceCount} medium-confidence transactions should be checked in the review queue.`,
    })
  }

  if (malformedCount > 0) {
    issues.push({
      severity: 'warning',
      title: 'Malformed or partial rows detected',
      detail: `${malformedCount} transaction row${malformedCount === 1 ? '' : 's'} are missing dates, descriptions, or reference hints.`,
    })
  }

  if (duplicateGroups.length > 0) {
    issues.push({
      severity: 'info',
      title: 'Overlapping statements were merged',
      detail: `${duplicateGroups.length} duplicate groups were collapsed to avoid double-counting.`,
    })
  }

  const validDates = rawTransactions
    .map((transaction) => transaction.date)
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date !== fallbackDate)
    .sort()
  if (validDates.length > 1) {
    let largestGap = 0
    for (let index = 1; index < validDates.length; index += 1) {
      const previous = new Date(`${validDates[index - 1]}T00:00:00`)
      const current = new Date(`${validDates[index]}T00:00:00`)
      largestGap = Math.max(largestGap, Math.round((current.getTime() - previous.getTime()) / 86400000))
    }

    if (largestGap >= 60) {
      issues.push({
        severity: 'warning',
        title: 'Large gaps in transaction dates',
        detail: `A gap of ${largestGap} days was found between parsed transactions. Check for missing pages or partial statement exports.`,
      })
    }
  }

  const score = Math.max(
    28,
    100 -
      issues.reduce((sum, issue) => {
        if (issue.severity === 'critical') return sum + 22
        if (issue.severity === 'warning') return sum + 12
        return sum + 4
      }, 0),
  )

  return {
    score,
    issues,
    pageCount,
    ocrPages,
    emptyPages,
    malformedCount,
  } satisfies StatementHealthReport
}

export function buildCsv(transactions: Transaction[]) {
  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.time,
    transaction.source,
    transaction.type,
    transaction.amount.toFixed(2),
    transaction.category,
    transaction.description,
    transaction.vendor,
    transaction.referenceId,
    transaction.utr,
    transaction.accountHint,
  ])

  return [ledgerCsvHeader, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n')
}

export function parseLedgerCsv(fileName: string, csvText: string): Transaction[] {
  const rows = parseCsvRows(csvText)

  if (rows.length < 2) {
    throw new Error('The CSV is empty or does not include any transaction rows.')
  }

  const header = rows[0]
  if (
    header.length !== ledgerCsvHeader.length ||
    header.some((value, index) => value.trim() !== ledgerCsvHeader[index])
  ) {
    throw new Error('This CSV does not match the UPInsight export format.')
  }

  return rows.slice(1).map((row, index) => {
    if (row.length !== ledgerCsvHeader.length) {
      throw new Error(`Row ${index + 2} does not match the expected column pattern.`)
    }

    const [
      date,
      time,
      source,
      type,
      amountRaw,
      category,
      description,
      vendor,
      referenceId,
      utr,
      accountHint,
    ] = row.map((value) => value.trim())

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      throw new Error(`Row ${index + 2} has an invalid date.`)
    }

    if (time && !/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(time)) {
      throw new Error(`Row ${index + 2} has an invalid time.`)
    }

    if (type !== 'credit' && type !== 'debit') {
      throw new Error(`Row ${index + 2} has an invalid transaction type.`)
    }

    const amount = Number.parseFloat(amountRaw)
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Row ${index + 2} has an invalid amount.`)
    }

    if (!source || !category || !description) {
      throw new Error(`Row ${index + 2} is missing a required field.`)
    }

    return {
      id: `${fileName}-${index}-${referenceId || utr || amount}`,
      source,
      date,
      time,
      description,
      vendor,
      category,
      type,
      amount,
      referenceId,
      utr,
      accountHint,
      rawBlock: row.join(','),
      confidence: 0.99,
      confidenceLabel: 'high',
      reviewReasons: [],
      duplicateKey: buildDuplicateKey({
        date,
        type,
        amount,
        vendor,
        description,
        referenceId,
        utr,
      }),
      isDuplicate: false,
      recurringKey: '',
      recurringCadence: '',
      recurringCount: 0,
    } satisfies Transaction
  })
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatStatementDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return value || 'Unknown date'
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function filterTransactionsByDateRange(
  transactions: Transaction[],
  startDate: string,
  endDate: string,
) {
  if (!startDate && !endDate) {
    return transactions
  }

  return transactions.filter((transaction) => {
    const afterStart = !startDate || transaction.date >= startDate
    const beforeEnd = !endDate || transaction.date <= endDate
    return afterStart && beforeEnd
  })
}

export function getDateRangePreset(
  preset: 'all' | 'last90' | 'thisMonth' | 'financialYear' | 'custom',
  transactions: Transaction[],
) {
  if (preset === 'custom') {
    return { startDate: '', endDate: '' }
  }

  const orderedDates = transactions.map((transaction) => transaction.date).filter(Boolean).sort()
  const latestDate = orderedDates.at(-1) ?? new Date().toISOString().slice(0, 10)
  const latest = new Date(`${latestDate}T00:00:00`)

  if (preset === 'all') {
    return {
      startDate: orderedDates[0] ?? '',
      endDate: orderedDates.at(-1) ?? '',
    }
  }

  if (preset === 'last90') {
    const start = new Date(latest)
    start.setDate(start.getDate() - 89)
    return { startDate: toIsoDate(start), endDate: latestDate }
  }

  if (preset === 'thisMonth') {
    return {
      startDate: toIsoDate(new Date(latest.getFullYear(), latest.getMonth(), 1)),
      endDate: latestDate,
    }
  }

  const financialYear = latest.getMonth() >= 3 ? latest.getFullYear() : latest.getFullYear() - 1
  return {
    startDate: `${financialYear}-04-01`,
    endDate: `${financialYear + 1}-03-31`,
  }
}

function periodKey(date: string, mode: 'date' | 'day' | 'month') {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return mode === 'month' ? date.slice(0, 7) : date
  }

  if (mode === 'date') {
    return date
  }

  if (mode === 'day') {
    return new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(parsed)
  }

  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(parsed)
}

function sortPeriodRows(
  rows: Array<{ label: string; amount: number }>,
  mode: 'date' | 'day' | 'month',
) {
  if (mode === 'date') {
    return rows.sort((a, b) => a.label.localeCompare(b.label))
  }

  if (mode === 'day') {
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return rows.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))
  }

  return rows.sort((a, b) => {
    const first = new Date(`01 ${a.label}`)
    const second = new Date(`01 ${b.label}`)
    return first.getTime() - second.getTime()
  })
}

function inferSmartCategory(normalized: string) {
  const entries = smartCategoryKnowledge.flatMap((item) =>
    item.keywords.map((keyword) => ({ keyword, category: item.category })),
  )

  const fuse = new Fuse(entries, {
    keys: ['keyword'],
    threshold: 0.34,
    ignoreLocation: true,
  })

  const result = fuse.search(normalized).at(0)
  return result?.item.category ?? null
}

function isRefundTransaction(transaction: Transaction) {
  const sample = `${transaction.description} ${transaction.vendor} ${transaction.category}`.toLowerCase()
  return transaction.type === 'credit' && /\b(refund|cashback|reversal|reversed)\b/.test(sample)
}

function isSalaryTransaction(transaction: Transaction) {
  const sample = `${transaction.description} ${transaction.vendor} ${transaction.category}`.toLowerCase()
  return transaction.type === 'credit' && /\b(salary|bonus|payroll)\b/.test(sample)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function parseCsvRows(csvText: string) {
  const sanitized = csvText.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let index = 0; index < sanitized.length; index += 1) {
    const character = sanitized[index]
    const nextCharacter = sanitized[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      currentRow.push(currentCell)
      currentCell = ''

      if (currentRow.some((value) => value.trim() !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      continue
    }

    currentCell += character
  }

  if (inQuotes) {
    throw new Error('The CSV contains an unclosed quoted value.')
  }

  currentRow.push(currentCell)
  if (currentRow.some((value) => value.trim() !== '')) {
    rows.push(currentRow)
  }

  return rows
}

function buildRecurringKey(transaction: Pick<Transaction, 'vendor' | 'description' | 'amount' | 'type'>) {
  if (transaction.type !== 'debit') {
    return ''
  }

  const identity = normalizeIdentity(transaction.vendor || transaction.description)
  if (!identity || identity.length < 3 || identity === 'unknown vendor') {
    return ''
  }

  return `${identity}:${transaction.amount.toFixed(2)}:${transaction.type}`
}

function inferRecurringCadence(transactions: Transaction[]): RecurringCadence | null {
  const gaps: number[] = []

  for (let index = 1; index < transactions.length; index += 1) {
    const previous = new Date(`${transactions[index - 1].date}T00:00:00`)
    const current = new Date(`${transactions[index].date}T00:00:00`)
    const gap = Math.round((current.getTime() - previous.getTime()) / 86400000)

    if (gap > 0) {
      gaps.push(gap)
    }
  }

  if (gaps.length === 0) {
    return null
  }

  const averageGap = gaps.reduce((sum, value) => sum + value, 0) / gaps.length
  const monthlyMatches = gaps.every((gap) => gap >= 20 && gap <= 40)
  const weeklyMatches = gaps.every((gap) => gap >= 5 && gap <= 10)

  if (monthlyMatches || (averageGap >= 24 && averageGap <= 35 && transactions.length >= 2)) {
    return 'monthly'
  }

  if (weeklyMatches || (averageGap >= 5 && averageGap <= 9 && transactions.length >= 2)) {
    return 'weekly'
  }

  if (transactions.length >= 3 && averageGap <= 45) {
    return 'irregular'
  }

  return null
}

function extractDateTime(line: string) {
  const dateOnly = line.match(/^([A-Za-z]{3}\s+\d{1,2},\s+\d{4}|\d{1,2}\s+[A-Za-z]{3},\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})$/i)
  if (dateOnly) {
    return { date: normalizeDate(dateOnly[1]), time: '' }
  }

  const combined = line.match(
    /^([A-Za-z]{3}\s+\d{1,2},\s+\d{4}|\d{1,2}\s+[A-Za-z]{3},\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(\d{1,2}:\d{2}\s?(?:AM|PM))$/i,
  )

  if (combined) {
    return {
      date: normalizeDate(combined[1]),
      time: combined[2].toUpperCase(),
    }
  }

  return null
}

export function createDemoDocuments() {
  return [
    {
      fileName: 'phonepe-demo.pdf',
      text: `
        Transaction Statement for +918604985020
        Jan 16, 2026
        05:57 PM
        Paid to Credit Card Bill Payment
        Transaction ID : T2601161757022581533872
        UTR No : 966222831963
        Debited from XX2728
        Debit
        INR 8744.53

        Jan 17, 2026
        09:16 PM
        Paid to VODAFONE IDEA LIMITED
        Transaction ID : T2601172116337832483965
        UTR No : 628653786555
        Debited from XX2728
        Debit
        INR 579.00

        Jan 27, 2026
        05:32 PM
        Bill paid - Credit Card
        Transaction ID : NB26012717321768685611112
        UTR No : 936078108542
        Debited from XX2728
        Debit
        INR 5154.00
      `,
    },
    {
      fileName: 'gpay-demo.pdf',
      text: `
        Google Pay
        09 Jan, 2026
        04:29 PM
        Received from Mo. Bilal
        UPI Transaction ID: 637589339416
        Paid to HDFC Bank 2728
        ₹110

        17 Jan, 2026
        08:46 PM
        Paid to Mohd Ayan
        UPI Transaction ID: 638395733138
        Paid by ICICI Bank 1411
        ₹50
      `,
    },
  ]
}
