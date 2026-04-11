import 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { PSM, createWorker } from 'tesseract.js'
import tesseractWorkerUrl from 'tesseract.js/dist/worker.min.js?url'
import tesseractCoreUrl from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url'
import engTrainedDataUrl from '@tesseract.js-data/eng/4.0.0/eng.traineddata.gz?url'

type IncomingMessage = {
  files: File[]
}

type OcrWorker = Awaited<ReturnType<typeof createWorker>>

const OCR_TEXT_THRESHOLD = 40
const OCR_SCALE = 2
const OCR_LANG_PATH = engTrainedDataUrl.replace(/\/eng\.traineddata\.gz$/, '')

let ocrWorkerPromise: Promise<OcrWorker> | null = null
let ocrDisabled = false

type RenderablePdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number }
  render: (options: {
    canvasContext: OffscreenCanvasRenderingContext2D
    viewport: { width: number; height: number }
    canvas: OffscreenCanvas
  }) => { promise: Promise<unknown> }
}

async function getOcrWorker() {
  if (ocrDisabled) {
    return null
  }

  if (!ocrWorkerPromise) {
    ocrWorkerPromise = createWorker('eng', 1, {
      workerPath: tesseractWorkerUrl,
      corePath: tesseractCoreUrl,
      langPath: OCR_LANG_PATH,
      gzip: true,
      workerBlobURL: false,
      logger: () => undefined,
      errorHandler: () => undefined,
    }).then(async (worker) => {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: '1',
      })
      return worker
    })
  }

  try {
    return await ocrWorkerPromise
  } catch {
    ocrDisabled = true
    ocrWorkerPromise = null
    return null
  }
}

function normalizeText(text: string) {
  return text.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function shouldRunOcr(text: string) {
  return normalizeText(text).replace(/\s+/g, ' ').length < OCR_TEXT_THRESHOLD
}

async function recognizePageWithOcr(page: RenderablePdfPage) {
  const ocrWorker = await getOcrWorker()
  if (!ocrWorker || typeof OffscreenCanvas === 'undefined') {
    return ''
  }

  const viewport = page.getViewport({ scale: OCR_SCALE })
  const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const context = canvas.getContext('2d', { alpha: false })

  if (!context) {
    return ''
  }

  await page.render({
    canvasContext: context as OffscreenCanvasRenderingContext2D,
    viewport,
    canvas,
  }).promise

  const result = await ocrWorker.recognize(canvas)
  return normalizeText(result.data.text || '')
}

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const { files } = event.data

  try {
    const documents = await Promise.all(
      files.map(async (file) => {
        const data = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data, isEvalSupported: false, useSystemFonts: false })

        const pdf = await loadingTask.promise
        const pageTexts: string[] = []
        let ocrPages = 0
        let emptyPages = 0

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber)
          const textContent = await page.getTextContent()
          const extractedText = normalizeText(
            textContent.items.map((item) => ('str' in item ? item.str : '')).join('\n'),
          )

          if (shouldRunOcr(extractedText)) {
            try {
              const ocrText = await recognizePageWithOcr(page as unknown as RenderablePdfPage)

              if (ocrText.length > extractedText.length) {
                pageTexts.push(ocrText)
              } else {
                pageTexts.push(extractedText)
              }

              if (ocrText) {
                ocrPages += 1
              } else {
                emptyPages += 1
              }
            } catch {
              pageTexts.push(extractedText)
              emptyPages += 1
            }
          } else {
            pageTexts.push(extractedText)
          }
        }

        return {
          fileName: file.name,
          text: pageTexts.join('\n\n'),
          pageCount: pdf.numPages,
          ocrUsed: ocrPages > 0,
          ocrPages,
          emptyPages,
        }
      }),
    )

    self.postMessage({
      type: 'success',
      documents,
    })
  } catch (error) {
    self.postMessage({
      type: 'error',
      fileName: files[0]?.name ?? 'statement.pdf',
      error: error instanceof Error ? error.message : 'Unknown PDF parsing error',
    })
  }
}
