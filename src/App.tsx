import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'
import { DEFAULT_RULES, type CategoryRule, type SavingsGoal, type Transaction, type WorkspaceName } from './lib/types'
import {
  analyzeStatementHealth,
  buildCsv,
  buildCashflowTimeline,
  buildMonthlyNarratives,
  categoryTotals,
  createDemoDocuments,
  filterTransactionsByDateRange,
  forecastSavingsGoal,
  formatCurrency,
  getDateRangePreset,
  interpretLedgerQuery,
  mergeAndAnalyzeTransactions,
  matchesLedgerQuery,
  parseDocuments,
  parseLedgerCsv,
  spendingByPeriod,
  summarizeDocuments,
  topVendors,
} from './lib/analyzer'
import { HomeView } from './components/home/HomeView'
import { MetricGrid } from './components/analyzer/MetricGrid'
import { DashboardGrid } from './components/analyzer/DashboardGrid'
import { VendorList } from './components/analyzer/VendorList'
import { RuleManager } from './components/analyzer/RuleManager'
import { TransactionTable } from './components/analyzer/TransactionTable'
import { ReviewQueue } from './components/analyzer/ReviewQueue'
import { RecurringPanel } from './components/analyzer/RecurringPanel'
import { MobileSectionNav } from './components/analyzer/MobileSectionNav'
import { LocalSummaryPanel } from './components/analyzer/LocalSummaryPanel'
import { CashflowTimeline } from './components/analyzer/CashflowTimeline'
import { GoalTracker } from './components/analyzer/GoalTracker'
import { HealthCheckPanel } from './components/analyzer/HealthCheckPanel'
import { Topbar, type ViewMode } from './components/layout/Topbar'
import { Dropzone } from './components/ui/Dropzone'

type ParsedDocument = {
  fileName: string
  text: string
  pageCount?: number
  ocrUsed?: boolean
  ocrPages?: number
  emptyPages?: number
}

type WorkerSuccess = {
  type: 'success'
  documents: ParsedDocument[]
}

type WorkerFailure = {
  type: 'error'
  fileName: string
  error: string
}

type WorkerReply = WorkerSuccess | WorkerFailure
type TrendMode = 'date' | 'day' | 'month'
type RangePreset = 'all' | 'last90' | 'thisMonth' | 'financialYear' | 'custom'
type AnalyzerSectionId = 'overview' | 'budgets' | 'rules' | 'ledger'
type Budget = { category: string; amount: number }
type ImportedLedger = { fileName: string; transactions: Transaction[] }
type WorkspaceState = {
  documents: ParsedDocument[]
  importedLedgers: ImportedLedger[]
  rules: CategoryRule[]
  budgets: Budget[]
  savingsGoal: SavingsGoal | null
  reviewedTransactionIds: string[]
}
type WorkspaceStates = Record<WorkspaceName, WorkspaceState>

const workspaceOptions = ['Personal', 'Business', 'Family'] as const satisfies readonly WorkspaceName[]
const workspaceStorageKey = 'spending-analyzer-workspaces'
const legacyStorageKey = 'spending-analyzer-data'
const activeWorkspaceStorageKey = 'spending-analyzer-active-workspace'
const MAX_PDF_FILES = 6

const createWorkspaceState = (): WorkspaceState => ({
  documents: [],
  importedLedgers: [],
  rules: DEFAULT_RULES.map((rule) => ({ ...rule })),
  budgets: [],
  savingsGoal: null,
  reviewedTransactionIds: [],
})

const createWorkspaceStates = (): WorkspaceStates => ({
  Personal: createWorkspaceState(),
  Business: createWorkspaceState(),
  Family: createWorkspaceState(),
})

function normalizeWorkspaceState(value: unknown): WorkspaceState {
  const candidate = (value ?? {}) as Partial<WorkspaceState>

  return {
    documents: Array.isArray(candidate.documents)
      ? candidate.documents
          .filter(
            (document): document is ParsedDocument =>
              Boolean(document) &&
              typeof document === 'object' &&
              typeof document.fileName === 'string' &&
              typeof document.text === 'string',
          )
          .map((document) => ({
            fileName: document.fileName,
            text: document.text,
            pageCount: typeof document.pageCount === 'number' ? document.pageCount : 0,
            ocrUsed: Boolean(document.ocrUsed),
            ocrPages: typeof document.ocrPages === 'number' ? document.ocrPages : 0,
            emptyPages: typeof document.emptyPages === 'number' ? document.emptyPages : 0,
          }))
      : [],
    importedLedgers: Array.isArray(candidate.importedLedgers)
      ? candidate.importedLedgers
          .filter(
            (ledger): ledger is ImportedLedger =>
              Boolean(ledger) &&
              typeof ledger === 'object' &&
              typeof ledger.fileName === 'string' &&
              Array.isArray(ledger.transactions),
          )
          .map((ledger) => ({
            fileName: ledger.fileName,
            transactions: ledger.transactions,
          }))
      : [],
    rules: Array.isArray(candidate.rules)
      ? candidate.rules
          .filter(
            (rule): rule is CategoryRule =>
              Boolean(rule) &&
              typeof rule === 'object' &&
              typeof rule.keyword === 'string' &&
              typeof rule.category === 'string',
          )
          .map((rule) => ({ keyword: rule.keyword, category: rule.category }))
      : DEFAULT_RULES.map((rule) => ({ ...rule })),
    budgets: Array.isArray(candidate.budgets)
      ? candidate.budgets
          .filter(
            (budget): budget is Budget =>
              Boolean(budget) &&
              typeof budget === 'object' &&
              typeof budget.category === 'string' &&
              typeof budget.amount === 'number',
          )
          .map((budget) => ({ category: budget.category, amount: budget.amount }))
      : [],
    savingsGoal:
      candidate.savingsGoal &&
      typeof candidate.savingsGoal === 'object' &&
      typeof candidate.savingsGoal.name === 'string' &&
      typeof candidate.savingsGoal.targetAmount === 'number' &&
      typeof candidate.savingsGoal.currentAmount === 'number'
        ? {
            name: candidate.savingsGoal.name,
            targetAmount: candidate.savingsGoal.targetAmount,
            currentAmount: candidate.savingsGoal.currentAmount,
          }
        : null,
    reviewedTransactionIds: Array.isArray(candidate.reviewedTransactionIds)
      ? candidate.reviewedTransactionIds.filter((id): id is string => typeof id === 'string')
      : [],
  }
}

function loadWorkspaceStates(): WorkspaceStates {
  const defaults = createWorkspaceStates()

  try {
    const savedWorkspaces = localStorage.getItem(workspaceStorageKey)
    if (savedWorkspaces) {
      const parsed = JSON.parse(savedWorkspaces) as Partial<WorkspaceStates>
      return {
        Personal: normalizeWorkspaceState(parsed.Personal),
        Business: normalizeWorkspaceState(parsed.Business),
        Family: normalizeWorkspaceState(parsed.Family),
      }
    }

    const legacySaved = localStorage.getItem(legacyStorageKey)
    if (!legacySaved) {
      return defaults
    }

    const parsedLegacy = JSON.parse(legacySaved)
    if (parsedLegacy && typeof parsedLegacy === 'object' && 'Personal' in parsedLegacy) {
      return {
        Personal: normalizeWorkspaceState((parsedLegacy as Record<string, unknown>).Personal),
        Business: normalizeWorkspaceState((parsedLegacy as Record<string, unknown>).Business),
        Family: normalizeWorkspaceState((parsedLegacy as Record<string, unknown>).Family),
      }
    }

    return {
      ...defaults,
      Personal: normalizeWorkspaceState(parsedLegacy),
    }
  } catch {
    return defaults
  }
}

function loadActiveWorkspace(): WorkspaceName {
  const saved = localStorage.getItem(activeWorkspaceStorageKey)
  return workspaceOptions.includes(saved as WorkspaceName) ? (saved as WorkspaceName) : 'Personal'
}

function App() {
  const workerRef = useRef<Worker | null>(null)
  const pdfInputRef = useRef<HTMLInputElement | null>(null)
  const csvInputRef = useRef<HTMLInputElement | null>(null)
  const parseWorkspaceRef = useRef<WorkspaceName>('Personal')
  const overviewSectionRef = useRef<HTMLDivElement | null>(null)
  const budgetsSectionRef = useRef<HTMLDivElement | null>(null)
  const rulesSectionRef = useRef<HTMLDivElement | null>(null)
  const ledgerSectionRef = useRef<HTMLDivElement | null>(null)

  const [view, setView] = useState<ViewMode>('home')
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceName>(loadActiveWorkspace)
  const [workspaceStates, setWorkspaceStates] = useState<WorkspaceStates>(loadWorkspaceStates)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [status, setStatus] = useState('Upload PhonePe and Google Pay statements to build a consolidated view.')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [ruleVendor, setRuleVendor] = useState('')
  const [budgetCategory, setBudgetCategory] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [dashboardSource, setDashboardSource] = useState('All')
  const [trendMode, setTrendMode] = useState<TrendMode>('date')
  const [trendPage, setTrendPage] = useState(0)
  const [pendingAssignments, setPendingAssignments] = useState<Array<{ vendor: string; category: string }>>([])
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([])
  const [rangePreset, setRangePreset] = useState<RangePreset>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [showExportSummary, setShowExportSummary] = useState(false)
  const [activeAnalyzerSection, setActiveAnalyzerSection] = useState<AnalyzerSectionId>('overview')

  const deferredSearch = useDeferredValue(search)
  const workspaceState = workspaceStates[currentWorkspace] ?? createWorkspaceState()
  const documents = workspaceState.documents
  const importedLedgers = workspaceState.importedLedgers
  const rules = workspaceState.rules
  const budgets = workspaceState.budgets
  const savingsGoal = workspaceState.savingsGoal
  const reviewedTransactionIds = workspaceState.reviewedTransactionIds

  const updateWorkspaceState = (
    workspace: WorkspaceName,
    updater: (state: WorkspaceState) => WorkspaceState,
  ) => {
    setWorkspaceStates((current) => {
      const previous = current[workspace] ?? createWorkspaceState()
      return {
        ...current,
        [workspace]: updater(previous),
      }
    })
  }

  useEffect(() => {
    localStorage.setItem(workspaceStorageKey, JSON.stringify(workspaceStates))
  }, [workspaceStates])

  useEffect(() => {
    localStorage.setItem(activeWorkspaceStorageKey, currentWorkspace)
  }, [currentWorkspace])

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 3600)

    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  useEffect(() => {
    const worker = new Worker(new URL('./workers/pdfWorker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data as Partial<WorkerReply> | undefined

      if (!message || typeof message !== 'object' || !('type' in message)) {
        setIsParsing(false)
        setError('The parser returned an invalid response.')
        setStatus('Parsing stopped unexpectedly.')
        return
      }

      if (message.type === 'error') {
        setIsParsing(false)
        const failure = message as Partial<WorkerFailure>
        setError(failure.error || 'Unknown PDF parsing error.')
        setStatus(`Could not read ${failure.fileName || 'statement.pdf'}.`)
        return
      }

      const success = message as Partial<WorkerSuccess>
      const targetWorkspace = parseWorkspaceRef.current
      const nextDocuments = Array.isArray(success.documents)
        ? success.documents
            .filter(
              (document): document is ParsedDocument =>
                Boolean(document) &&
                typeof document === 'object' &&
                typeof document.fileName === 'string' &&
                typeof document.text === 'string',
            )
            .map((document) => ({
              fileName: document.fileName,
              text: document.text,
              pageCount: typeof document.pageCount === 'number' ? document.pageCount : 0,
              ocrUsed: Boolean(document.ocrUsed),
              ocrPages: typeof document.ocrPages === 'number' ? document.ocrPages : 0,
              emptyPages: typeof document.emptyPages === 'number' ? document.emptyPages : 0,
            }))
        : []

      if (nextDocuments.length === 0) {
        setIsParsing(false)
        setCurrentWorkspace(targetWorkspace)
        setView('tool')
        setError('No readable transaction text was extracted from the uploaded PDF.')
        setStatus('Parsing completed, but no statement rows were detected.')
        return
      }

      updateWorkspaceState(targetWorkspace, (current) => ({
        ...current,
        documents: [...current.documents, ...nextDocuments],
      }))

      const ocrPages = nextDocuments.reduce((sum, document) => sum + (document.ocrPages ?? 0), 0)
      const ocrNote =
        ocrPages > 0 ? ` OCR fallback read ${ocrPages} page${ocrPages === 1 ? '' : 's'}.` : ''

      setIsParsing(false)
      setError('')
      setCurrentWorkspace(targetWorkspace)
      setView('tool')
      setStatus(
        `Processed ${nextDocuments.length} statement file${nextDocuments.length === 1 ? '' : 's'} and merged them into ${targetWorkspace}.${ocrNote}`,
      )
      setToastMessage(
        `Analysis complete. ${nextDocuments.length} PDF${nextDocuments.length === 1 ? '' : 's'} merged into ${targetWorkspace}.${ocrNote}`,
      )
    }

    worker.onerror = (event) => {
      setIsParsing(false)
      setError(event.message || 'The PDF worker crashed while reading your file.')
      setStatus('Parsing stopped unexpectedly.')
    }

    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  const parseResult = useMemo(() => {
    try {
      return {
        transactions: parseDocuments(documents, rules),
        parseError: '',
      }
    } catch (caughtError) {
      return {
        transactions: [] as Transaction[],
        parseError:
          caughtError instanceof Error ? caughtError.message : 'Could not parse the uploaded statement.',
      }
    }
  }, [documents, rules])

  const importedTransactions = useMemo(
    () => importedLedgers.flatMap((ledger) => ledger.transactions),
    [importedLedgers],
  )

  const mergedAnalysis = useMemo(
    () => mergeAndAnalyzeTransactions([...parseResult.transactions, ...importedTransactions]),
    [parseResult.transactions, importedTransactions],
  )

  const transactions = mergedAnalysis.transactions
  const duplicateGroups = mergedAnalysis.duplicateGroups
  const recurringInsights = mergedAnalysis.recurringInsights
  const duplicateCount = useMemo(
    () => duplicateGroups.reduce((sum, group) => sum + group.count - 1, 0),
    [duplicateGroups],
  )

  const presetRange = useMemo(
    () => getDateRangePreset(rangePreset, transactions),
    [rangePreset, transactions],
  )

  const activeStartDate = rangePreset === 'custom' ? customStartDate : presetRange.startDate
  const activeEndDate = rangePreset === 'custom' ? customEndDate : presetRange.endDate
  const scopedTransactions = useMemo(
    () => filterTransactionsByDateRange(transactions, activeStartDate, activeEndDate),
    [transactions, activeStartDate, activeEndDate],
  )

  const parseError = parseResult.parseError
  const displayError = error || parseError
  const displayStatus = parseError ? 'Parsing finished with warnings.' : status
  const hasTransactions = transactions.length > 0
  const sourceCount = documents.length + importedLedgers.length

  const reviewQueueTransactions = useMemo(
    () =>
      scopedTransactions.filter(
        (transaction) =>
          !reviewedTransactionIds.includes(transaction.id) &&
          (transaction.confidenceLabel !== 'high' || transaction.category === 'Uncategorized'),
      ),
    [reviewedTransactionIds, scopedTransactions],
  )

  const dashboardTransactions = useMemo(
    () =>
      dashboardSource === 'All'
        ? scopedTransactions
        : scopedTransactions.filter((transaction) => transaction.source === dashboardSource),
    [dashboardSource, scopedTransactions],
  )

  const summary = useMemo(() => summarizeDocuments(scopedTransactions), [scopedTransactions])
  const categories = useMemo(() => categoryTotals(dashboardTransactions), [dashboardTransactions])
  const dashboardTotalExpense = useMemo(
    () =>
      dashboardTransactions
        .filter((transaction) => transaction.type === 'debit')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    [dashboardTransactions],
  )
  const trend = useMemo(() => spendingByPeriod(scopedTransactions, trendMode), [scopedTransactions, trendMode])
  const vendors = useMemo(() => topVendors(scopedTransactions), [scopedTransactions])

  const vendorOptions = useMemo(
    () =>
      [...new Set(transactions.map((transaction) => transaction.vendor).filter(Boolean))]
        .sort((first, second) => first.localeCompare(second)),
    [transactions],
  )

  const availableCategories = useMemo(
    () =>
      [...new Set([...rules.map((rule) => rule.category), ...transactions.map((transaction) => transaction.category)])]
        .filter(Boolean)
        .sort(),
    [rules, transactions],
  )

  const sourceOptions = useMemo(
    () => ['All', ...new Set(scopedTransactions.map((transaction) => transaction.source))],
    [scopedTransactions],
  )

  const naturalLanguageQuery = useMemo(
    () => interpretLedgerQuery(search, availableCategories, sourceOptions.filter((option) => option !== 'All')),
    [availableCategories, search, sourceOptions],
  )

  const filteredTransactions = useMemo(() => {
    const plainSearch = deferredSearch.trim().toLowerCase()

    return scopedTransactions.filter((transaction) => {
      const matchesSearch =
        plainSearch.length === 0 || matchesLedgerQuery(transaction, naturalLanguageQuery)

      return (
        matchesSearch &&
        (categoryFilter === 'All' || transaction.category === categoryFilter) &&
        (sourceFilter === 'All' || transaction.source === sourceFilter) &&
        (typeFilter === 'All' || transaction.type === typeFilter) &&
        (dateFilter === '' || transaction.date.startsWith(dateFilter))
      )
    })
  }, [
    scopedTransactions,
    deferredSearch,
    naturalLanguageQuery,
    categoryFilter,
    sourceFilter,
    typeFilter,
    dateFilter,
  ])

  const categoryOptions = useMemo(
    () => ['All', ...new Set(scopedTransactions.map((transaction) => transaction.category))],
    [scopedTransactions],
  )

  const trendPageSize = trendMode === 'date' ? 7 : trendMode === 'month' ? 6 : 7
  const trendPageCount = Math.max(Math.ceil(trend.length / trendPageSize), 1)
  const currentTrendPage = Math.min(trendPage, trendPageCount - 1)
  const pagedTrend = useMemo(() => {
    const start = currentTrendPage * trendPageSize
    return trend.slice(start, start + trendPageSize)
  }, [trend, currentTrendPage, trendPageSize])

  const selectedTransactions = useMemo(
    () => filteredTransactions.filter((transaction) => selectedTransactionIds.includes(transaction.id)),
    [filteredTransactions, selectedTransactionIds],
  )

  const selectedTransactionsTotal = useMemo(
    () =>
      selectedTransactions.reduce(
        (sum, transaction) => sum + (transaction.type === 'debit' ? -transaction.amount : transaction.amount),
        0,
      ),
    [selectedTransactions],
  )

  const exportPreview = useMemo(() => {
    const sources = [...new Set(filteredTransactions.map((transaction) => transaction.source))].sort()
    const categoriesInExport = [...new Set(filteredTransactions.map((transaction) => transaction.category))].sort()
    const debitRows = filteredTransactions.filter((transaction) => transaction.type === 'debit')
    const creditRows = filteredTransactions.filter((transaction) => transaction.type === 'credit')
    const totalDebit = debitRows.reduce((sum, transaction) => sum + transaction.amount, 0)
    const totalCredit = creditRows.reduce((sum, transaction) => sum + transaction.amount, 0)
    const dateWindow =
      activeStartDate || activeEndDate
        ? `${activeStartDate || 'Beginning'} to ${activeEndDate || 'Latest'}`
        : 'All available data'

    return {
      rowCount: filteredTransactions.length,
      sources,
      categoriesInExport,
      debitCount: debitRows.length,
      creditCount: creditRows.length,
      totalDebit,
      totalCredit,
      dateWindow,
      fileName: `spending-analyzer-${new Date().toISOString().slice(0, 10)}.csv`,
    }
  }, [activeEndDate, activeStartDate, filteredTransactions])

  const monthlyNarratives = useMemo(() => buildMonthlyNarratives(scopedTransactions), [scopedTransactions])
  const cashflowTimeline = useMemo(() => buildCashflowTimeline(scopedTransactions), [scopedTransactions])
  const savingsForecast = useMemo(
    () => forecastSavingsGoal(scopedTransactions, savingsGoal),
    [scopedTransactions, savingsGoal],
  )
  const statementHealth = useMemo(
    () => analyzeStatementHealth(documents, parseResult.transactions, duplicateGroups),
    [documents, parseResult.transactions, duplicateGroups],
  )
  const ledgerQueryInsights = useMemo(
    () => [
      ...naturalLanguageQuery.recognizedFilters,
      ...naturalLanguageQuery.textTerms.map((term) => `Contains "${term}"`),
    ],
    [naturalLanguageQuery],
  )

  const scrollSectionIntoView = (section: AnalyzerSectionId) => {
    if (typeof window === 'undefined' || window.matchMedia('(max-width: 860px)').matches) {
      return
    }

    const refMap = {
      overview: overviewSectionRef,
      budgets: budgetsSectionRef,
      rules: rulesSectionRef,
      ledger: ledgerSectionRef,
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        refMap[section].current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    })
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !workerRef.current) {
      return
    }

    const files = Array.from(fileList).filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
    )

    if (files.length === 0) {
      setError('Please upload PDF statements only.')
      setStatus('No PDF files were detected in that selection.')
      setToastMessage('')
      return
    }

    if (files.length > MAX_PDF_FILES) {
      setError(`You can analyze up to ${MAX_PDF_FILES} PDFs at once.`)
      setStatus(`Too many files selected. Please upload ${MAX_PDF_FILES} PDFs or fewer in one batch.`)
      setToastMessage('')
      return
    }

    parseWorkspaceRef.current = currentWorkspace
    setError('')
    setToastMessage('')
    setIsParsing(true)
    setStatus(
      `Reading ${files.length} PDF file${files.length === 1 ? '' : 's'} in ${currentWorkspace} using a background worker...`,
    )
    workerRef.current.postMessage({ files })
  }

  const handleCsvImport = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) {
      return
    }

    if (!(file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv'))) {
      setError('Please import a CSV file exported by Spending Analyzer.')
      setStatus('CSV import failed because the selected file is not a .csv.')
      setToastMessage('')
      return
    }

    try {
      const csvText = await file.text()
      const importedRows = parseLedgerCsv(file.name, csvText)

      updateWorkspaceState(currentWorkspace, (current) => ({
        ...current,
        importedLedgers: [
          ...current.importedLedgers,
          {
            fileName: file.name,
            transactions: importedRows,
          },
        ],
      }))

      setError('')
      setView('tool')
      setStatus(
        `Imported ${importedRows.length} ledger row${importedRows.length === 1 ? '' : 's'} into ${currentWorkspace}. Duplicate-safe merge is now active.`,
      )
      setToastMessage(
        `CSV imported successfully. ${importedRows.length} transaction${importedRows.length === 1 ? '' : 's'} merged into ${currentWorkspace}.`,
      )
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The CSV could not be imported.')
      setStatus(`Could not import ${file.name}.`)
      setToastMessage('')
    }
  }

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      return
    }

    try {
      const csv = buildCsv(filteredTransactions)
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')

      anchor.href = url
      anchor.download = exportPreview.fileName
      anchor.style.display = 'none'

      document.body.append(anchor)
      anchor.click()
      anchor.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)

      setShowExportSummary(false)
      setError('')
      setStatus(`Exported ${filteredTransactions.length} transaction row${filteredTransactions.length === 1 ? '' : 's'} to CSV.`)
      setToastMessage(
        `CSV export started. ${filteredTransactions.length} row${filteredTransactions.length === 1 ? '' : 's'} included.`,
      )
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The CSV could not be exported.')
      setStatus('CSV export failed.')
      setToastMessage('')
    }
  }

  const addRule = () => {
    const keyword = (newKeyword.trim() || ruleVendor.trim()).toLowerCase()
    const category = newCategory.trim()

    if (!keyword || !category) {
      return
    }

    updateWorkspaceState(currentWorkspace, (current) => {
      const exists = current.rules.some(
        (rule) => rule.keyword.toLowerCase() === keyword && rule.category === category,
      )

      return exists
        ? current
        : {
            ...current,
            rules: [{ keyword, category }, ...current.rules],
          }
    })

    setStatus(`Saved a categorization rule for "${keyword}" in ${currentWorkspace}.`)
    setNewKeyword('')
    setNewCategory('')
    setRuleVendor('')
  }

  const addPendingAssignment = () => {
    const vendor = ruleVendor.trim() || newKeyword.trim()
    const category = newCategory.trim()

    if (!vendor || !category) {
      return
    }

    setPendingAssignments((current) => {
      const next = current.filter((assignment) => assignment.vendor !== vendor)
      return [...next, { vendor, category }]
    })
    setRuleVendor('')
    setNewKeyword('')
    setNewCategory('')
  }

  const regenerateCategories = () => {
    if (pendingAssignments.length === 0) {
      return
    }

    updateWorkspaceState(currentWorkspace, (current) => {
      const nextRules = [...current.rules]

      for (const assignment of pendingAssignments) {
        const keyword = assignment.vendor.toLowerCase()
        const exists = nextRules.some(
          (rule) => rule.keyword.toLowerCase() === keyword && rule.category === assignment.category,
        )

        if (!exists) {
          nextRules.unshift({
            keyword,
            category: assignment.category,
          })
        }
      }

      return {
        ...current,
        rules: nextRules,
      }
    })

    setPendingAssignments([])
    setStatus('Regenerated charts and ledger categories using your queued vendor assignments.')
    setToastMessage('Category rules updated. Charts and ledger views have been regenerated.')
  }

  const removeRule = (index: number) => {
    updateWorkspaceState(currentWorkspace, (current) => ({
      ...current,
      rules: current.rules.filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  const toggleSelectedTransaction = (transactionId: string) => {
    setSelectedTransactionIds((current) =>
      current.includes(transactionId)
        ? current.filter((id) => id !== transactionId)
        : [...current, transactionId],
    )
  }

  const loadDemo = () => {
    updateWorkspaceState(currentWorkspace, () => ({
      documents: createDemoDocuments(),
      importedLedgers: [],
      rules: DEFAULT_RULES.map((rule) => ({ ...rule })),
      budgets: [],
      savingsGoal: null,
      reviewedTransactionIds: [],
    }))

    setStatus(`Loaded demo statement text into ${currentWorkspace}.`)
    setError('')
    setView('tool')
  }

  const addBudget = () => {
    const category = budgetCategory.trim()
    const amount = Number.parseFloat(budgetAmount)

    if (!category || Number.isNaN(amount) || amount <= 0) {
      return
    }

    updateWorkspaceState(currentWorkspace, (current) => {
      const nextBudgets = current.budgets.filter((budget) => budget.category !== category)
      nextBudgets.push({ category, amount })
      return {
        ...current,
        budgets: nextBudgets.sort((first, second) => first.category.localeCompare(second.category)),
      }
    })

    setBudgetCategory('')
    setBudgetAmount('')
  }

  const removeBudget = (category: string) => {
    updateWorkspaceState(currentWorkspace, (current) => ({
      ...current,
      budgets: current.budgets.filter((budget) => budget.category !== category),
    }))
  }

  const saveSavingsGoal = (nextGoal: SavingsGoal) => {
    updateWorkspaceState(currentWorkspace, (current) => ({
      ...current,
      savingsGoal: nextGoal,
    }))
    setStatus(`Saved the savings goal for ${currentWorkspace}.`)
  }

  const clearSavingsGoal = () => {
    updateWorkspaceState(currentWorkspace, (current) => ({
      ...current,
      savingsGoal: null,
    }))
  }

  const budgetProgress = useMemo(
    () =>
      budgets.map((budget) => {
        const spent = scopedTransactions
          .filter((transaction) => transaction.type === 'debit' && transaction.category === budget.category)
          .reduce((sum, transaction) => sum + transaction.amount, 0)

        return {
          ...budget,
          spent,
          ratio: Math.min(spent / budget.amount, 1.4),
          exceeded: spent > budget.amount,
          remaining: budget.amount - spent,
        }
      }),
    [budgets, scopedTransactions],
  )
  const analyzerSections = useMemo(
    () => [
      {
        id: 'overview' as const,
        label: 'Overview',
        title: 'See the full shape of this workspace.',
        description: 'Summary, trends, vendors, and cash flow in one view.',
        meta:
          summary.transactionCount === 0
            ? 'No transactions in the current range.'
            : `${summary.transactionCount} transaction${summary.transactionCount === 1 ? '' : 's'} in range`,
        highlights: [
          exportPreview.dateWindow,
          `${sourceCount} source${sourceCount === 1 ? '' : 's'} connected`,
        ],
      },
      {
        id: 'budgets' as const,
        label: 'Planning',
        title: 'Plan budgets, goals, and date windows.',
        description: 'Set limits, adjust the range, and track savings pace.',
        meta:
          budgetProgress.length === 0
            ? 'No budgets active yet.'
            : `${budgetProgress.length} budget${budgetProgress.length === 1 ? '' : 's'} active`,
        highlights: [
          activeStartDate || activeEndDate ? exportPreview.dateWindow : 'All available data',
          savingsGoal ? `Goal: ${savingsGoal.name}` : 'No savings goal yet',
        ],
      },
      {
        id: 'rules' as const,
        label: 'Review',
        title: 'Resolve uncertain items and improve categorization.',
        description: 'Work through uncertain rows and save lasting rules.',
        meta:
          reviewQueueTransactions.length === 0
            ? 'Review queue is clear.'
            : `${reviewQueueTransactions.length} item${reviewQueueTransactions.length === 1 ? '' : 's'} waiting`,
        highlights: [
          `${rules.length} saved rule${rules.length === 1 ? '' : 's'}`,
          `${duplicateGroups.length} duplicate group${duplicateGroups.length === 1 ? '' : 's'}`,
        ],
      },
      {
        id: 'ledger' as const,
        label: 'Ledger',
        title: 'Search, filter, and refine the unified ledger.',
        description: 'Search naturally, filter rows, and save category rules inline.',
        meta:
          filteredTransactions.length === scopedTransactions.length
            ? `${filteredTransactions.length} row${filteredTransactions.length === 1 ? '' : 's'} visible`
            : `${filteredTransactions.length} of ${scopedTransactions.length} row${
                scopedTransactions.length === 1 ? '' : 's'
              } visible`,
        highlights: [
          selectedTransactionIds.length > 0
            ? `${selectedTransactionIds.length} transaction${selectedTransactionIds.length === 1 ? '' : 's'} selected`
            : 'No transactions selected',
          search.trim() ? 'Search active' : 'Search ready',
        ],
      },
    ],
    [
      activeEndDate,
      activeStartDate,
      budgetProgress,
      duplicateGroups.length,
      exportPreview.dateWindow,
      filteredTransactions.length,
      reviewQueueTransactions.length,
      rules.length,
      savingsGoal,
      scopedTransactions.length,
      search,
      selectedTransactionIds.length,
      sourceCount,
      summary.transactionCount,
    ],
  )
  const activeSectionMeta =
    analyzerSections.find((section) => section.id === activeAnalyzerSection) ?? analyzerSections[0]

  const markTransactionReviewed = (transactionId: string) => {
    updateWorkspaceState(currentWorkspace, (current) =>
      current.reviewedTransactionIds.includes(transactionId)
        ? current
        : {
            ...current,
            reviewedTransactionIds: [...current.reviewedTransactionIds, transactionId],
          },
    )
  }

  const applyReviewCategoryRule = (transaction: Transaction, category: string) => {
    if (!category) {
      return
    }

    const keyword = (transaction.vendor || transaction.description).trim().toLowerCase()
    if (!keyword) {
      return
    }

    updateWorkspaceState(currentWorkspace, (current) => {
      const exists = current.rules.some(
        (rule) => rule.keyword.toLowerCase() === keyword && rule.category === category,
      )
      const nextReviewed = current.reviewedTransactionIds.includes(transaction.id)
        ? current.reviewedTransactionIds
        : [...current.reviewedTransactionIds, transaction.id]

      return {
        ...current,
        rules: exists ? current.rules : [{ keyword, category }, ...current.rules],
        reviewedTransactionIds: nextReviewed,
      }
    })

    setStatus(`Saved a rule for "${transaction.vendor || transaction.description}" and resolved the review item.`)
    setToastMessage('Review item resolved. The ledger and analytics will refresh automatically.')
  }

  const handleUploadClick = () => {
    pdfInputRef.current?.click()
  }

  const handleImportCsvClick = () => {
    csvInputRef.current?.click()
  }


  const openLedgerWithFilters = ({
    searchTerm = '',
    category = 'All',
    source = 'All',
    type = 'All',
    date = '',
  }: {
    searchTerm?: string
    category?: string
    source?: string
    type?: string
    date?: string
  }) => {
    setSearch(searchTerm)
    setCategoryFilter(category)
    setSourceFilter(source)
    setTypeFilter(type)
    setDateFilter(date)
    setActiveAnalyzerSection('ledger')
    scrollSectionIntoView('ledger')
  }

  const handleMetricCardClick = (card: 'statements' | 'transactions' | 'income' | 'expense' | 'net') => {
    if (card === 'income') {
      openLedgerWithFilters({ type: 'credit' })
      return
    }

    if (card === 'expense') {
      openLedgerWithFilters({ type: 'debit' })
      return
    }

    openLedgerWithFilters({})
  }

  const applyQueryExample = (query: string) => {
    openLedgerWithFilters({
      searchTerm: query,
      category: 'All',
      source: 'All',
      type: 'All',
      date: '',
    })
  }

  const handleCategoryDrilldown = (category: string) => {
    openLedgerWithFilters({
      category,
      type: 'debit',
      source: dashboardSource === 'All' ? 'All' : dashboardSource,
    })
  }

  const handleVendorDrilldown = (vendor: string) => {
    openLedgerWithFilters({ searchTerm: vendor })
  }

  const handleTrendDrilldown = (label: string, mode: TrendMode) => {
    if (mode === 'date') {
      openLedgerWithFilters({ date: label, type: 'debit' })
      return
    }

    if (mode === 'month') {
      const monthDate = new Date(`01 ${label}`)
      if (!Number.isNaN(monthDate.getTime())) {
        const monthPrefix = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
        openLedgerWithFilters({ date: monthPrefix, type: 'debit' })
        return
      }
    }

    openLedgerWithFilters({ type: 'debit' })
    setStatus('Trend drill-down is most specific in Date or Month mode. The ledger has been opened with debit transactions for the current range.')
  }

  const handleTimelineEventDrilldown = (event: { label: string; kind: 'salary' | 'refund' | 'spike' }) => {
    if (event.kind === 'salary') {
      openLedgerWithFilters({ searchTerm: event.label, type: 'credit' })
      return
    }

    if (event.kind === 'refund') {
      openLedgerWithFilters({ searchTerm: `refund ${event.label}`, type: 'credit' })
      return
    }

    openLedgerWithFilters({ searchTerm: event.label, type: 'debit' })
  }

  const jumpToSection = (section: AnalyzerSectionId) => {
    setActiveAnalyzerSection(section)
    scrollSectionIntoView(section)
  }

  return (
    <div className={`page-shell ${view === 'home' ? 'home-view' : 'tool-view'}`}>
      <Topbar
        view={view}
        setView={setView}
        onUploadClick={handleUploadClick}
      />

      <input
        ref={pdfInputRef}
        className="hidden-input"
        type="file"
        accept="application/pdf"
        multiple
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <input
        ref={csvInputRef}
        className="hidden-input"
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          void handleCsvImport(event.target.files)
          event.target.value = ''
        }}
      />

      <AnimatePresence>
        {toastMessage ? (
          <motion.div
            className="toast-stack"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="toast toast-success">
              <strong>Analysis ready</strong>
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showExportSummary && filteredTransactions.length > 0 ? (
          <motion.div
            className="export-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="export-modal panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
            >
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Export summary</p>
                  <h2>Review what goes into the CSV</h2>
                </div>
              </div>

              <div className="export-summary-grid">
                <div className="export-summary-item">
                  <span>Workspace</span>
                  <strong>{currentWorkspace}</strong>
                </div>
                <div className="export-summary-item">
                  <span>Rows</span>
                  <strong>{exportPreview.rowCount}</strong>
                </div>
                <div className="export-summary-item">
                  <span>Date window</span>
                  <strong>{exportPreview.dateWindow}</strong>
                </div>
                <div className="export-summary-item">
                  <span>File name</span>
                  <strong>{exportPreview.fileName}</strong>
                </div>
              </div>

              <div className="export-receipt">
                <div className="receipt-row">
                  <span>Debit rows</span>
                  <strong>{exportPreview.debitCount}</strong>
                </div>
                <div className="receipt-row">
                  <span>Credit rows</span>
                  <strong>{exportPreview.creditCount}</strong>
                </div>
                <div className="receipt-row">
                  <span>Total debit</span>
                  <strong>{formatCurrency(exportPreview.totalDebit)}</strong>
                </div>
                <div className="receipt-row">
                  <span>Total credit</span>
                  <strong>{formatCurrency(exportPreview.totalCredit)}</strong>
                </div>
              </div>

              <div className="empty-preview-list export-preview-chips">
                {exportPreview.sources.map((source) => (
                  <span key={source}>{source}</span>
                ))}
                {exportPreview.categoriesInExport.slice(0, 4).map((category) => (
                  <span key={category}>{category}</span>
                ))}
              </div>

              <div className="export-modal-actions">
                <button className="button button-secondary" onClick={() => setShowExportSummary(false)}>
                  Cancel
                </button>
                <button className="button button-primary" onClick={handleExport}>
                  Download CSV
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <HomeView setView={setView} loadDemo={loadDemo} />
          </motion.div>
        ) : (
          <motion.div
            key="tool"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="app-shell"
          >
            {!hasTransactions ? (
              <section className="hero-panel">
                <div className="hero-copy">
                  <p className="eyebrow">Get started</p>
                  <h1>Start with a private statement batch.</h1>
                  <p className="hero-text">
                    Upload PDFs or import a CSV to start a private workspace.
                  </p>
                  <div className="hero-actions hero-actions-primary">
                    <button className="button button-primary button-hero" onClick={handleUploadClick}>
                      Analyze PDF statements
                    </button>
                    <button className="button button-secondary" onClick={handleImportCsvClick}>
                      Import CSV ledger
                    </button>
                  </div>
                  <div className="hero-actions hero-actions-secondary">
                    <button className="button button-tertiary" onClick={loadDemo}>
                      Explore sample data
                    </button>
                  </div>
                  <div className="hero-inline-notes">
                    <span>Up to {MAX_PDF_FILES} PDFs per batch</span>
                    <span>PhonePe + GPay</span>
                    <span>Local only</span>
                  </div>
                  <div className="status-row">
                    <span className={`status-dot ${isParsing ? 'live' : ''}`}></span>
                    <span>{displayStatus}</span>
                  </div>
                  {displayError ? (
                    <div className="error-banner">
                      <strong>Something needs attention</strong>
                      <p>{displayError}</p>
                    </div>
                  ) : null}
                </div>

                <Dropzone
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  handleFiles={handleFiles}
                  maxFiles={MAX_PDF_FILES}
                />
              </section>
            ) : (
              <section className="workspace-header panel">
                <div className="workspace-header-copy">
                  <p className="panel-kicker">Analyzer workspace</p>
                  <h1>{activeSectionMeta.title}</h1>
                  <p className="hero-text">{activeSectionMeta.description}</p>
                  <div className="workspace-header-highlights">
                    {activeSectionMeta.highlights.map((highlight) => (
                      <span key={highlight}>{highlight}</span>
                    ))}
                  </div>
                  <div className="status-row workspace-status-row">
                    <span className={`status-dot ${isParsing ? 'live' : ''}`}></span>
                    <span>{displayStatus}</span>
                  </div>
                  {displayError ? (
                    <div className="error-banner">
                      <strong>Something needs attention</strong>
                      <p>{displayError}</p>
                    </div>
                  ) : null}
                </div>

                <div className="workspace-header-actions">
                  <div className="workspace-action-card">
                    <span className="workspace-action-label">Quick actions</span>
                    <div className="workspace-action-grid">
                      <button className="button button-primary" onClick={handleUploadClick}>
                        Add PDF batch
                      </button>
                      <button className="button button-secondary" onClick={handleImportCsvClick}>
                        Import CSV
                      </button>
                      <button
                        className="button button-secondary"
                        onClick={() => setShowExportSummary(true)}
                        disabled={filteredTransactions.length === 0}
                      >
                        Export CSV
                      </button>
                      <button className="button button-tertiary" onClick={() => jumpToSection('rules')}>
                        {reviewQueueTransactions.length > 0 ? 'Open review queue' : 'Review categorization'}
                      </button>
                    </div>
                    <p className="workspace-action-note">
                      Import, export, or jump into review from here.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {isParsing ? (
              <section className="loading-shell">
                <div className="panel loading-panel">
                  <div className="loading-copy">
                    <p className="panel-kicker">Preparing workspace</p>
                    <h2>Analyzing your statements</h2>
                    <p className="empty-text">
                      Extracting rows and refreshing your workspace locally.
                    </p>
                  </div>
                  <div className="loading-metric-grid">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div className="loading-card" key={index}>
                        <span className="skeleton-line short"></span>
                        <span className="skeleton-line medium"></span>
                      </div>
                    ))}
                  </div>
                  <div className="loading-chart-grid">
                    <div className="loading-chart-card">
                      <span className="skeleton-line short"></span>
                      <div className="chart-skeleton donut"></div>
                    </div>
                    <div className="loading-chart-card">
                      <span className="skeleton-line short"></span>
                      <div className="chart-skeleton bars">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <i key={index}></i>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {!isParsing && !hasTransactions ? (
              <section className="workspace-onboarding">
                <div className="panel onboarding-intro">
                  <p className="panel-kicker">Onboarding</p>
                  <h2>Your workspace is ready for the first statement.</h2>
                  <p className="empty-text">
                    Start with PDFs or import a previous CSV.
                  </p>
                  <div className="empty-preview-list">
                    <span>Category charts</span>
                    <span>Ledger search</span>
                    <span>Recurring payments</span>
                  </div>
                  <div className="onboarding-actions">
                    <button className="button button-primary button-hero" onClick={handleUploadClick}>
                      Upload your first PDFs
                    </button>
                    <button className="button button-secondary" onClick={handleImportCsvClick}>
                      Import previous CSV
                    </button>
                  </div>
                </div>

                <div className="onboarding-grid">
                  <article className="panel onboarding-card">
                    <p className="panel-kicker">Step 1</p>
                    <h3>Bring in statement files</h3>
                    <p className="empty-text">
                      Drop up to {MAX_PDF_FILES} PDFs at once.
                    </p>
                  </article>
                  <article className="panel onboarding-card">
                    <p className="panel-kicker">Step 2</p>
                    <h3>Review the unified ledger</h3>
                    <p className="empty-text">
                      Review rows, trends, and flagged items.
                    </p>
                  </article>
                  <article className="panel onboarding-card">
                    <p className="panel-kicker">Step 3</p>
                    <h3>Refine categories and repeat payments</h3>
                    <p className="empty-text">
                      Save rules, spot repeats, and plan budgets.
                    </p>
                  </article>
                </div>
              </section>
            ) : null}

            {!isParsing && hasTransactions ? (
              <div className="analyzer-workspace-shell">
                <aside className="desktop-section-nav panel">
                  <div className="desktop-section-nav-head">
                    <p className="panel-kicker">Workspace sections</p>
                    <h2>Move through one job at a time.</h2>
                    <p className="empty-text">
                      Keep one task in focus at a time.
                    </p>
                  </div>

                  <nav className="desktop-section-list" aria-label="Analyzer workspace sections">
                    {analyzerSections.map((section) => (
                      <button
                        key={section.id}
                        className={`desktop-section-link ${activeAnalyzerSection === section.id ? 'active' : ''}`}
                        onClick={() => jumpToSection(section.id)}
                      >
                        <div className="desktop-section-link-top">
                          <span>{section.label}</span>
                          <strong>{section.meta}</strong>
                        </div>
                      </button>
                    ))}
                  </nav>

                  <div className="desktop-section-sidebar-note">
                    <span className="meta-chip neutral">{exportPreview.dateWindow}</span>
                  </div>
                </aside>

                <div className="analyzer-workspace-main">
                  <MobileSectionNav activeSection={activeAnalyzerSection} onJump={jumpToSection} />

                  <section className="workspace-section-intro panel">
                    <div>
                      <p className="panel-kicker">{activeSectionMeta.label}</p>
                      <h2>{activeSectionMeta.title}</h2>
                    </div>
                    <div className="workspace-section-intro-copy">
                      <div className="workspace-section-highlights">
                        {activeSectionMeta.highlights.map((highlight) => (
                          <span key={highlight}>{highlight}</span>
                        ))}
                      </div>
                    </div>
                  </section>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeAnalyzerSection}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="analyzer-section-stage"
                    >
                      <div
                        ref={overviewSectionRef}
                        data-section="overview"
                        data-active={activeAnalyzerSection === 'overview'}
                        className="analyzer-section-stack analyzer-tab-panel"
                      >
                        <section className="insight-strip">
                          <article className="panel insight-card">
                            <span>Needs review</span>
                            <strong>{reviewQueueTransactions.length}</strong>
                            <p>Confidence checks and uncategorized rows waiting for approval.</p>
                          </article>
                          <article className="panel insight-card">
                            <span>Duplicates merged</span>
                            <strong>{duplicateCount}</strong>
                            <p>Overlapping imports are collapsed before they reach analytics.</p>
                          </article>
                          <article className="panel insight-card">
                            <span>Recurring payments</span>
                            <strong>{recurringInsights.length}</strong>
                            <p>Likely subscriptions, EMIs, and repeat charges detected locally.</p>
                          </article>
                        </section>

                        <MetricGrid
                          statementsCount={sourceCount}
                          transactionCount={summary.transactionCount}
                          totalIncome={summary.totalIncome}
                          totalExpense={summary.totalExpense}
                          net={summary.net}
                          onCardClick={handleMetricCardClick}
                        />

                        <section className="summary-insights-grid">
                          <LocalSummaryPanel summaries={monthlyNarratives} />
                          <HealthCheckPanel health={statementHealth} />
                        </section>

                        <DashboardGrid
                          categories={categories}
                          totalExpense={dashboardTotalExpense}
                          trendMode={trendMode}
                          setTrendMode={setTrendMode}
                          trend={trend}
                          trendPage={currentTrendPage}
                          trendPageSize={trendPageSize}
                          setTrendPage={setTrendPage}
                          trendPageCount={trendPageCount}
                          pagedTrend={pagedTrend}
                          dashboardSource={dashboardSource}
                          setDashboardSource={setDashboardSource}
                          sourceOptions={sourceOptions}
                          onCategorySelect={handleCategoryDrilldown}
                          onTrendSelect={handleTrendDrilldown}
                        />

                        <VendorList vendors={vendors} onVendorSelect={handleVendorDrilldown} />
                        <RecurringPanel recurringInsights={recurringInsights} onRecurringSelect={handleVendorDrilldown} />
                        <CashflowTimeline events={cashflowTimeline} onSelectEvent={handleTimelineEventDrilldown} />
                      </div>

                      <div
                        ref={budgetsSectionRef}
                        data-section="budgets"
                        data-active={activeAnalyzerSection === 'budgets'}
                        className="analyzer-section-stack analyzer-tab-panel"
                      >
                        <section className="control-grid">
                          <div className="panel">
                            <div className="panel-header">
                              <div>
                                <p className="panel-kicker">Date range</p>
                                <h2>Custom analysis window</h2>
                              </div>
                            </div>
                            <div className="filters">
                              <select value={rangePreset} onChange={(event) => setRangePreset(event.target.value as RangePreset)}>
                                <option value="all">All available data</option>
                                <option value="last90">Last 90 Days</option>
                                <option value="thisMonth">Current Month</option>
                                <option value="financialYear">Previous Financial Year</option>
                                <option value="custom">Custom Range</option>
                              </select>
                              <input
                                type="date"
                                value={activeStartDate}
                                onChange={(event) => {
                                  setRangePreset('custom')
                                  setCustomStartDate(event.target.value)
                                }}
                              />
                              <input
                                type="date"
                                value={activeEndDate}
                                onChange={(event) => {
                                  setRangePreset('custom')
                                  setCustomEndDate(event.target.value)
                                }}
                              />
                            </div>
                          </div>

                          <div className="panel">
                            <div className="panel-header">
                              <div>
                                <p className="panel-kicker">Budgeting</p>
                                <h2>Monthly limits & goals</h2>
                              </div>
                            </div>
                            <div className="rules-form">
                              <select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)}>
                                <option value="">Choose category</option>
                                {availableCategories.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={budgetAmount}
                                onChange={(event) => setBudgetAmount(event.target.value)}
                                placeholder="Monthly budget amount"
                                inputMode="decimal"
                              />
                              <button className="button button-primary compact" onClick={addBudget}>
                                Save budget
                              </button>
                            </div>
                            <div className="budget-list">
                              {budgetProgress.length === 0 ? (
                                <div className="empty-state-block">
                                  <p className="empty-text">Set a budget to compare spending against a limit.</p>
                                  <div className="empty-preview-list">
                                    <span>Groceries target</span>
                                    <span>Travel cap</span>
                                  </div>
                                </div>
                              ) : (
                                budgetProgress.map((budget) => (
                                  <div className="budget-item" key={budget.category}>
                                    <div className="budget-head">
                                      <div>
                                        <strong>{budget.category}</strong>
                                        <span>
                                          {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)}
                                        </span>
                                      </div>
                                      <button
                                        className="button button-tertiary compact"
                                        onClick={() => removeBudget(budget.category)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                    <div className="budget-track">
                                      <div
                                        className={`budget-fill ${budget.exceeded ? 'exceeded' : ''}`}
                                        style={{ width: `${Math.min(budget.ratio * 100, 100)}%` }}
                                      ></div>
                                    </div>
                                    <span className={`budget-note ${budget.exceeded ? 'exceeded' : ''}`}>
                                      {budget.exceeded
                                        ? `${formatCurrency(Math.abs(budget.remaining))} over budget`
                                        : `${formatCurrency(budget.remaining)} remaining`}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </section>

                        <GoalTracker
                          key={`${currentWorkspace}-${savingsGoal?.name ?? 'goal'}`}
                          goal={savingsGoal}
                          forecast={savingsForecast}
                          onSaveGoal={saveSavingsGoal}
                          onClearGoal={clearSavingsGoal}
                        />
                      </div>

                      <div
                        ref={rulesSectionRef}
                        data-section="rules"
                        data-active={activeAnalyzerSection === 'rules'}
                        className="analyzer-section-stack analyzer-tab-panel"
                      >
                        <ReviewQueue
                          transactions={reviewQueueTransactions}
                          duplicateGroups={duplicateGroups}
                          availableCategories={availableCategories}
                          onApplyCategoryRule={applyReviewCategoryRule}
                          onMarkReviewed={markTransactionReviewed}
                        />

                        <RuleManager
                          rules={rules}
                          vendorOptions={vendorOptions}
                          availableCategories={availableCategories}
                          pendingAssignments={pendingAssignments}
                          ruleVendor={ruleVendor}
                          newKeyword={newKeyword}
                          newCategory={newCategory}
                          setRuleVendor={setRuleVendor}
                          setNewKeyword={setNewKeyword}
                          setNewCategory={setNewCategory}
                          addPendingAssignment={addPendingAssignment}
                          addRule={addRule}
                          regenerateCategories={regenerateCategories}
                          removeRule={removeRule}
                        />
                      </div>

                      <div
                        ref={ledgerSectionRef}
                        data-section="ledger"
                        data-active={activeAnalyzerSection === 'ledger'}
                        className="analyzer-section-stack analyzer-tab-panel"
                      >
                        <TransactionTable
                          filteredTransactions={filteredTransactions}
                          selectedTransactions={selectedTransactions}
                          selectedTransactionIds={selectedTransactionIds}
                          selectedTransactionsTotal={selectedTransactionsTotal}
                          setSelectedTransactionIds={setSelectedTransactionIds}
                          toggleSelectedTransaction={toggleSelectedTransaction}
                          search={search}
                          setSearch={setSearch}
                          categoryFilter={categoryFilter}
                          setCategoryFilter={setCategoryFilter}
                          sourceFilter={sourceFilter}
                          setSourceFilter={setSourceFilter}
                          typeFilter={typeFilter}
                          setTypeFilter={setTypeFilter}
                          dateFilter={dateFilter}
                          setDateFilter={setDateFilter}
                          categoryOptions={categoryOptions}
                          sourceOptions={sourceOptions}
                          availableCategories={availableCategories}
                          onInlineApplyRule={applyReviewCategoryRule}
                          queryInsights={ledgerQueryInsights}
                          onApplyQueryExample={applyQueryExample}
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
