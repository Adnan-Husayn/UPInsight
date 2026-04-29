# Project Context: Privacy-First Spending Analyzer

## 1. High-Level Summary
This project is a high-performance, privacy-focused web application built with React, Vite, and TypeScript. Its primary purpose is to parse, analyze, and visualize UPI transaction data from local PDF bank statements (such as PhonePe and Google Pay) entirely in the browser. It strictly enforces a "zero-data retention" policy—no financial data ever leaves the user's device, and there is no backend server or external API dependency.

## 2. Architecture & Tech Stack
- **Framework & Build:** React 19, TypeScript, and Vite.
- **Styling:** Vanilla CSS using CSS variables and a modern glassmorphic aesthetic (`index.css`, `App.css`). It specifically avoids Tailwind CSS. Dark mode is the primary and only supported theme.
- **State Management:** Heavy usage of React Hooks (`useState`, `useMemo`, `useDeferredValue`) and `localStorage` to persist non-sensitive user configurations, category rules, budgets, and parsed ledger items between sessions.
- **PDF Extraction:** A Web Worker (`src/workers/pdfWorker.ts`) utilizes `pdfjs-dist` to extract raw text strings from uploaded PDFs completely off the main thread, preventing UI freezing.
- **Data Parsing & Categorization:** Pure TypeScript implementation (`src/lib/analyzer.ts`). Contains robust regex pipelines to normalize chaotic text lines, extract entities (Dates, Amounts, UTRs), infer transaction types (Debit/Credit), and categorize them using keyword dictionaries and `Fuse.js` for fuzzy string matching.
- **Visualizations:** `Recharts` is utilized for rendering responsive, interactive charts (e.g., trend lines and category distributions).
- **Animations:** `framer-motion` manages smooth layout transitions, presence toggling (`<AnimatePresence>`), and hover physics.

## 3. Data Flow
1. **Input:** Users drag-and-drop or upload local PDF statements (limited to 6 per batch) or import a previously exported CSV.
2. **Extraction:** The files are sent to `pdfWorker.ts`, which bypasses rendering and uses `pdfjsLib.getDocument()` to sequentially scrape raw text off every page, returning a flattened string array back to the main thread.
3. **Parsing (`analyzer.ts`):** 
   - `parseDocuments()` standardizes the text lines, purging arbitrary headers.
   - Text is split into transaction block chunks delimited by recognized Date/Time anchors.
   - Semantic entities are extracted (Vendor, Amount, Reference ID / UTR, Date, Time, Sender/Receiver, Account Hint).
   - Direction (Debit vs. Credit) is inferred based on verb context (e.g., "Paid to", "Received from").
4. **Categorization:** Scans the description/vendor strings against a dynamic list of user-defined rules and a baseline "Smart Category Knowledge" array using fuzzy matching to assign labels like "Food & Dining" or "Fuel & Travel".
5. **Consumption:** Parsed objects populate the centralized React state, automatically trickling down to metric grids, Recharts elements, tables, and budgeting indicators via `useMemo` hooks.

## 4. Key Components and Files

### Core Logic
- `src/App.tsx`: The primary orchestration level. Hydrates initial state from `localStorage`, registers and communicates with the Web Worker, maintains all active filters (date, search, categories), and builds the global layout structure.
- `src/workers/pdfWorker.ts`: Wraps `pdfjs-dist`, reading binary buffers and returning extracted strings asynchronously.
- `src/lib/analyzer.ts`: The absolute core of the data intelligence. It includes document chunking, Regex heuristics, CSV ingest/export logic, math aggregation functions (`spendingByPeriod`, `categoryTotals`, `summarizeDocuments`), and string normalization workflows.
- `src/lib/types.ts`: TypeScript definition schemas (`Transaction`, `CategoryRule`, etc.).

### UI Components (`src/components/`)
- `layout/Topbar.tsx`: Global navigation linking between home, analyzer tooling, and file uploading actions.
- `home/HomeView.tsx` & `home/LandingHero.tsx`: The marketing/landing pages when no data is parsed.
- `ui/Dropzone.tsx`: Drag-and-drop file ingestion interface.
- `analyzer/DashboardGrid.tsx`: Acts as the chart aggregation container; deeply integrates with Recharts.
- `analyzer/MetricGrid.tsx`: Top-level statistic cards (Income vs. Expense vs. Net).
- `analyzer/TransactionTable.tsx`: A searchable, paginated tabular view natively rendering all extracted transaction rows.
- `analyzer/RuleManager.tsx`: A UI interface enabling users to assign persistent categories to specific vendors.
- `analyzer/VendorList.tsx`: Summarizes and ranks top spending avenues.

## 5. Design System
The aesthetic ethos is "premium, glassmorphic dark mode".
- **Backgrounds:** Deep space/obsidian bases (`#07111f`) featuring subtle, radial mesh gradients (soft blue, purple, and teal intersections overlayed under the UI).
- **Surfaces:** Floating translucent panels (`rgba(12, 22, 38, 0.82)`) with thin muted borders, casting distinct structural shadows.
- **Typography:** Display elements (H1, H2) use an elegant serif (`Iowan Old Style`, `Georgia`) to feel highly polished/editorial. Standard UI control inputs, tables, and buttons use a clean sans-serif (`Inter`, `Avenir Next`) for immediate legibility.
- **Interactions:** Hover states natively shift element borders, colors, and utilize smooth transforms powered natively via CSS and Framer Motion context wrappers.

## 6. Notable Architecture Guidelines & Quirks
1. **WASM Implementation Note:** While early discussions or older plans might have referenced a Rust/WASM parsing engine, the active production implementation relies *entirely* on pure TypeScript regex routines in `analyzer.ts` running sequentially. There are no custom `.rs` or `.wasm` files maintained in this repository (WASM is only used implicitly inside the standalone `pdfjs-dist` node module).
2. **Strict Dark Mode Policy:** Light mode logic, variables, and theme toggling have been fully deprecated and scrubbed from the codebase. The application now runs exclusively in its dark theme aesthetic.
3. **Local First, No API Calls:** Every feature relies on client-side JS executing natively in the DOM or Worker. Do not attempt to abstract functions like search, export, or OCR out to external API routes like Firebase or AWS. Everything runs locally, preserving the key product mandate of zero-data retention.
