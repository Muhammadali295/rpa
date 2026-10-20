export const DOCUMENT_ANALYSIS_URL = 'http://127.0.0.1:8000/analyze/document'
export const DOCUMENT_MAX_SIZE_BYTES = 200_000_000
export const DOCUMENT_ANALYSIS_TIMEOUT_MS = 10 * 60 * 1000
export const DOCUMENT_ALLOWED_FILE_EXTENSIONS = ['pdf'] as const
export const DOCUMENT_ALLOWED_MIME_TYPES = ['application/pdf'] as const

export type DocumentAnalysisResponse =
  | { state: 'completed'; data: unknown }
  | { state: 'processing' }

type DocumentAnalysisErrorCode = 'http' | 'network' | 'timeout' | 'aborted'

export class DocumentAnalysisApiError extends Error {
  constructor(
    readonly code: DocumentAnalysisErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'DocumentAnalysisApiError'
  }
}

export function analyzeDocument(
  file: File,
  onUploadProgress: (loaded: number, total: number) => void,
  onProcessing: (loaded: number, total: number) => void,
  onRequest: (request: XMLHttpRequest) => void,
): Promise<DocumentAnalysisResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    onRequest(request)
    request.open('POST', DOCUMENT_ANALYSIS_URL)
    request.timeout = DOCUMENT_ANALYSIS_TIMEOUT_MS

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onUploadProgress(event.loaded, event.total)
    })
    request.upload.addEventListener('load', (event) => {
      onProcessing(event.loaded, event.total)
    })
    request.addEventListener('load', () => {
      if (request.status < 200 || request.status >= 300) {
        reject(
          new DocumentAnalysisApiError(
            'http',
            'The analysis service returned an unsuccessful status.',
            request.status,
          ),
        )
        return
      }

      if (request.status === 202) {
        resolve({ state: 'processing' })
        return
      }

      resolve({ state: 'completed', data: parseResponse(request.responseText) })
    })
    request.addEventListener('error', () => {
      reject(new DocumentAnalysisApiError('network', 'The analysis service could not be reached.'))
    })
    request.addEventListener('timeout', () => {
      reject(new DocumentAnalysisApiError('timeout', 'The analysis request timed out.'))
    })
    request.addEventListener('abort', () => {
      reject(new DocumentAnalysisApiError('aborted', 'The analysis request was cancelled.'))
    })

    request.send(formData)
  })
}

function parseResponse(responseText: string): unknown {
  if (!responseText) return null

  try {
    return JSON.parse(responseText) as unknown
  } catch (error) {
    if (error instanceof SyntaxError) return responseText
    throw error
  }
}
