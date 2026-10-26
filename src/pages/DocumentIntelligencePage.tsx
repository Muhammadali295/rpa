import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Card, StatusBadge } from '../components/ui'
import {
  analyzeDocument,
  DOCUMENT_ALLOWED_FILE_EXTENSIONS,
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_ANALYSIS_TIMEOUT_MS,
  DOCUMENT_MAX_SIZE_BYTES,
  DocumentAnalysisApiError,
} from '../services/documentIntelligenceApi'

type PageStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'timed-out'

const MAX_FILE_SIZE_LABEL = '200 MB'
const CLAIM_ATTRIBUTE_FIELDS = [
  'document_type',
  'employee_name',
  'employee_claim_no',
  'employee_contact_no',
  'submitted_by_employee',
  'document_summary',
  'bills_attached',
  'total_bill_amount',
  'bill_summary_items',
  'document_submitted_date',
  'document_received_date',
  'prescription_attached',
  'prescription_items',
] as const

export function DocumentIntelligencePage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<PageStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [result, setResult] = useState<unknown>()
  const [errorMessage, setErrorMessage] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<XMLHttpRequest | null>(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  function clearAnalysis() {
    requestRef.current = null
    setFile(null)
    setStatus('idle')
    setUploadProgress(null)
    setResult(undefined)
    setErrorMessage('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function selectFile(candidate: File) {
    if (status === 'uploading' || (status === 'processing' && requestRef.current)) {
      return
    }

    const extension = candidate.name.split('.').pop()?.toLowerCase()
    const supportedExtension = DOCUMENT_ALLOWED_FILE_EXTENSIONS.some(
      (allowedExtension) => allowedExtension === extension,
    )
    const supportedMimeType = !candidate.type || DOCUMENT_ALLOWED_MIME_TYPES.some(
      (allowedMimeType) => allowedMimeType === candidate.type,
    )
    if (!supportedExtension || !supportedMimeType) {
      setErrorMessage('Choose a PDF file to continue.')
      setStatus('failed')
      return
    }

    if (candidate.size > DOCUMENT_MAX_SIZE_BYTES) {
      setErrorMessage(`The selected file exceeds the ${MAX_FILE_SIZE_LABEL} limit.`)
      setStatus('failed')
      return
    }

    setFile(candidate)
    setStatus('idle')
    setUploadProgress(null)
    setResult(undefined)
    setErrorMessage('')
  }

  function onFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0]
    if (selected) selectFile(selected)
    event.currentTarget.value = ''
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (status === 'uploading' || (status === 'processing' && requestRef.current)) return

    const droppedFiles = Array.from(event.dataTransfer.files)
    if (droppedFiles.length !== 1) {
      setErrorMessage('Select one PDF document at a time.')
      setStatus('failed')
      return
    }

    selectFile(droppedFiles[0])
  }

  async function submitFile() {
    if (!file || status === 'uploading' || status === 'processing') return

    setStatus('uploading')
    setUploadProgress(0)
    setResult(undefined)
    setErrorMessage('')

    try {
      const response = await analyzeDocument(
        file,
        (loaded, total) => {
          setUploadProgress(Math.min(100, Math.round((loaded / total) * 100)))
        },
        (loaded, total) => {
          setUploadProgress(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null)
          setStatus('processing')
        },
        (request) => {
          requestRef.current = request
        },
      )
      requestRef.current = null

      if (response.state === 'processing') {
        setStatus('processing')
        setUploadProgress(null)
        return
      }

      setResult(response.data)
      setStatus('completed')
      setUploadProgress(null)
    } catch (error) {
      requestRef.current = null
      setUploadProgress(null)

      if (error instanceof DocumentAnalysisApiError && error.code === 'aborted') {
        return
      }
      if (error instanceof DocumentAnalysisApiError && error.code === 'timeout') {
        setErrorMessage(
          `No response was received within ${DOCUMENT_ANALYSIS_TIMEOUT_MS / 60_000} minutes. The backend may still be processing the document.`,
        )
        setStatus('timed-out')
        return
      }
      if (error instanceof DocumentAnalysisApiError && error.code === 'http') {
        setErrorMessage(`The backend returned an error (HTTP ${error.status}).`)
        setStatus('failed')
        return
      }

      setErrorMessage(
        'The document could not be sent. Check that the analysis service is available and try again.',
      )
      setStatus('failed')
    }
  }

  const busy = status === 'uploading' || (status === 'processing' && requestRef.current !== null)

  return (
    <div className="di-page">
      <Card className="di-upload-card">
        <div className="di-card-heading">
          <div>
            <h2>Analyze a document</h2>
            <p>Choose a PDF to begin a new analysis.</p>
          </div>
          {status !== 'idle' && (
            <StatusBadge
              tone={
                status === 'completed'
                  ? 'success'
                  : status === 'failed' || status === 'timed-out'
                    ? 'danger'
                    : 'teal'
              }
            >
              {statusLabel(status)}
            </StatusBadge>
          )}
        </div>

        <input
          ref={inputRef}
          className="di-file-input"
          type="file"
          accept={[
            ...DOCUMENT_ALLOWED_FILE_EXTENSIONS.map((extension) => `.${extension}`),
            ...DOCUMENT_ALLOWED_MIME_TYPES,
          ].join(',')}
          aria-label="Choose a PDF document"
          onChange={onFileInputChange}
          disabled={busy}
        />

        {!file ? (
          <div
            className={`di-drop-zone ${dragging ? 'di-drop-zone--active' : ''}`}
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-disabled={busy}
            onClick={() => !busy && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (!busy && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault()
              if (!busy) setDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDragging(false)
              }
            }}
            onDrop={onDrop}
          >
            <span className="di-drop-icon"><FileUp size={21} aria-hidden="true" /></span>
            <strong>Drag and drop a PDF here</strong>
            <span>or <span className="di-browse-link">browse files</span></span>
            <small>PDF only · Maximum file size {MAX_FILE_SIZE_LABEL}</small>
          </div>
        ) : (
          <div className="di-selected-file">
            <span className="di-file-icon"><FileText size={19} aria-hidden="true" /></span>
            <div className="di-file-details">
              <strong title={file.name}>{file.name}</strong>
              <span>
                {formatFileSize(file.size)} · PDF
                {file.type ? ` (${file.type})` : ' · MIME type not reported'}
              </span>
            </div>
            {!busy && status !== 'processing' && (
              <div className="di-file-actions">
                <button
                  className="di-text-button"
                  type="button"
                  onClick={() => inputRef.current?.click()}
                >
                  Replace
                </button>
                <button
                  className="di-icon-button"
                  type="button"
                  aria-label="Remove selected document"
                  onClick={clearAnalysis}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {status === 'uploading' && (
          <div className="di-progress" aria-live="polite">
            <div className="di-progress__label">
              <span>Uploading document</span>
              <span>{uploadProgress === null ? 'Sending…' : `${uploadProgress}%`}</span>
            </div>
            <progress
              className="di-progress__bar"
              max="100"
              value={uploadProgress ?? undefined}
              aria-label="Upload progress"
            />
          </div>
        )}

        {status === 'processing' && (
          <div className="di-state-message di-state-message--processing" role="status">
            <RefreshCw size={17} aria-hidden="true" />
            <div>
              <strong>Waiting for backend response</strong>
              <p>
                {busy
                  ? 'The upload is complete. Waiting for the analysis response from the backend.'
                  : 'The backend accepted the document, but no job-status endpoint was provided. Completion cannot be confirmed here.'}
              </p>
            </div>
          </div>
        )}

        {(status === 'failed' || status === 'timed-out') && (
          <div className="di-state-message di-state-message--error" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            <div>
              <strong>{status === 'timed-out' ? 'Analysis timed out' : 'Analysis could not be completed'}</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="di-upload-actions">
          {file && status === 'idle' && (
            <button className="di-button di-button--primary" type="button" onClick={submitFile}>
              <FileUp size={16} aria-hidden="true" />
              Analyze document
            </button>
          )}
          {status === 'completed' && (
            <button className="di-button di-button--secondary" type="button" onClick={clearAnalysis}>
              <RefreshCw size={15} aria-hidden="true" />
              Analyze another document
            </button>
          )}
          {(status === 'processing' && !busy || status === 'failed' || status === 'timed-out') && (
            <button className="di-button di-button--secondary" type="button" onClick={clearAnalysis}>
              <RefreshCw size={15} aria-hidden="true" />
              Start another upload
            </button>
          )}
          {status === 'idle' && (
            <span className="di-limit-note">
              Accepted file: PDF · Maximum {MAX_FILE_SIZE_LABEL}
            </span>
          )}
        </div>
      </Card>

      {status === 'completed' && (
        <Card className="di-results-card">
          <div className="di-card-heading">
            <div className="di-result-title">
              <span className="di-result-check"><CheckCircle2 size={18} aria-hidden="true" /></span>
              <div>
                <h2>Backend response</h2>
                <p>Analysis response received for {file?.name ?? 'the uploaded document'}.</p>
              </div>
            </div>
            <StatusBadge tone="success">Completed</StatusBadge>
          </div>

          <div className="di-schema-note">
            Showing requested claim attributes. Additional backend metadata is hidden.
          </div>
          <ResponseFields value={result} />
        </Card>
      )}
    </div>
  )
}

function ResponseFields({ value }: { value: unknown }) {
  const claimAttributes = getClaimAttributes(value)

  if (claimAttributes === null) {
    return <p className="di-no-fields">The backend response did not include claim_attributes.</p>
  }

  const fields: Array<{ path: string; value: string | unknown[] }> = []
  Object.entries(claimAttributes).forEach(([key, fieldValue]) => {
    if ((key === 'bill_summary_items' || key === 'prescription_items') && Array.isArray(fieldValue)) {
      fields.push({ path: key, value: fieldValue })
      return
    }

    fields.push(...flattenResponse(fieldValue, key))
  })

  if (fields.length === 0) {
    return <p className="di-no-fields">The backend returned no requested claim attributes.</p>
  }

  return (
    <div className="di-result-table-wrap">
      <table className="di-result-table">
        <thead>
          <tr>
            <th scope="col">Backend field</th>
            <th scope="col">Returned value</th>
          </tr>
        </thead>
        <tbody>
          {fields.map(({ path, value: fieldValue }) => (
            <tr key={path}>
              <th scope="row">{path}</th>
              <td>
                {Array.isArray(fieldValue)
                  ? <ArrayItemsTable items={fieldValue} />
                  : fieldValue}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ArrayItemsTable({ items }: { items: unknown[] }) {
  if (items.length === 0) {
    return <span className="di-no-items">No items returned.</span>
  }

  const columns = Array.from(new Set(
    items.flatMap((item) => isRecord(item) ? Object.keys(item) : []),
  ))
  const tableColumns = columns.length > 0 ? columns : ['item']

  return (
    <table className="di-result-table di-result-table--nested">
      <thead>
        <tr>
          {tableColumns.map((column) => (
            <th key={column} scope="col">{formatColumnName(column)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={index}>
            {tableColumns.map((column) => (
              <td key={column}>
                {isRecord(item)
                  ? formatValue(item[column])
                  : formatValue(item)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function formatColumnName(value: string) {
  return value.replace(/_/g, ' ')
}

function formatValue(value: unknown): string {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'object') return JSON.stringify(value) ?? String(value)
  return String(value)
}

function getClaimAttributes(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null

  const claimAttributes = value.claim_attributes
  if (!isRecord(claimAttributes)) return null

  return Object.fromEntries(
    CLAIM_ATTRIBUTE_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(claimAttributes, field))
      .map((field) => [field, claimAttributes[field]]),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function flattenResponse(value: unknown, prefix = ''): Array<{ path: string; value: string }> {
  if (value !== null && typeof value === 'object') {
    const entries = Array.isArray(value)
      ? value.map((entry, index) => [String(index), entry] as const)
      : Object.entries(value)

    if (entries.length === 0) {
      return [{ path: prefix || 'Response', value: Array.isArray(value) ? '[]' : '{}' }]
    }

    return entries.flatMap(([key, entry]) =>
      flattenResponse(entry, prefix ? `${prefix}.${key}` : key),
    )
  }

  return [{ path: prefix || 'Response', value: value === null ? 'null' : String(value) }]
}

function statusLabel(status: PageStatus) {
  switch (status) {
    case 'uploading':
      return 'Uploading'
    case 'processing':
      return 'Processing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'timed-out':
      return 'Timed out'
    default:
      return ''
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`
  return `${(bytes / 1_000_000).toFixed(bytes >= 10_000_000 ? 0 : 1)} MB`
}
