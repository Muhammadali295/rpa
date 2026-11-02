import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Pill,
  Receipt,
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
import './claim-results.css'

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
  const [, setErrorMessage] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<XMLHttpRequest | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  useEffect(() => () => requestRef.current?.abort(), [])

  useEffect(() => {
    if (!file) {
      setFileUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function clearAnalysis() {
    requestRef.current = null
    setFile(null)
    setViewerOpen(false)
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
  const notClaim = status === 'completed' && isNotClaimDocument(result)

  return (
    <div className="di-page">
      <Card className="di-upload-card">
        <div className="di-card-heading">
          <div>
            <h2>Process Claim Document</h2>
            <p>Select a PDF file to begin extraction.</p>
          </div>
          {status !== 'idle' && (
            <StatusBadge
              tone={
                status === 'completed'
                  ? notClaim ? 'danger' : 'success'
                  : status === 'failed' || status === 'timed-out'
                    ? 'danger'
                    : 'teal'
              }
            >
               {notClaim ? 'Not a claim' : statusLabel(status)}
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
          <div className="di-state-message di-state-message--processing" role="status" aria-busy={busy}>
            {busy ? (
              <span className="di-spinner" aria-hidden="true" />
            ) : (
              <RefreshCw size={17} aria-hidden="true" />
            )}
            <div>
              <strong>{busy ? 'Analysing document…' : 'Waiting for response'}</strong>
              <p>
                {busy
                  ? 'The upload is complete. Retrieving information from the document. This may take a minute.'
                  : 'The backend accepted the document, but no job-status endpoint was provided. Completion cannot be confirmed here.'}
              </p>
              {busy && <div className="di-loader-bar" aria-hidden="true" />}
            </div>
          </div>
        )}

        {(status === 'failed' || status === 'timed-out') && (
          <div className="di-state-message di-state-message--error" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            <div>
              <strong>{status === 'timed-out' ? 'Extraction timed out' : 'Extraction could not be completed'}</strong>
              {/* <p>{errorMessage}</p> */}
            </div>
          </div>
        )}

        <div className="di-upload-actions">
          {file && (
            <button
              className="di-button di-button--secondary"
              type="button"
              onClick={() => setViewerOpen((open) => !open)}
            >
              <FileText size={15} aria-hidden="true" />
              {viewerOpen ? 'Hide document' : 'View document'}
            </button>
          )}
          {file && status === 'idle' && (
            <button className="di-button di-button--primary" type="button" onClick={submitFile}>
              <FileUp size={16} aria-hidden="true" />
              Process Claim
            </button>
          )}
          {status === 'completed' && (
            <button className="di-button di-button--secondary" type="button" onClick={clearAnalysis}>
              <RefreshCw size={15} aria-hidden="true" />
              Process another claim
            </button>
          )}
          {(status === 'processing' && !busy || status === 'failed' || status === 'timed-out') && (
            <button className="di-button di-button--secondary" type="button" onClick={clearAnalysis}>
              <RefreshCw size={15} aria-hidden="true" />
              Process another claim
            </button>
          )}
          {status === 'idle' && (
            <span className="di-limit-note">
              Accepted file: PDF · Maximum {MAX_FILE_SIZE_LABEL}
            </span>
          )}
        </div>
      </Card>

      {viewerOpen && file && fileUrl && (
        <Card className="di-viewer-card">
          <div className="di-card-heading">
            <div>
              <h2>Document Viewer</h2>
              <p>{file.name}</p>
            </div>
            <a className="di-text-button" href={fileUrl} target="_blank" rel="noreferrer">
              Open in new tab
            </a>
          </div>
          <iframe
            src={fileUrl}
            title={`Preview of ${file.name}`}
            style={{ display: 'block', width: '100%', height: '80vh', minHeight: 480, border: 0 }}
          />
        </Card>
      )}

      {status === 'completed' && notClaim && (
        <Card className="di-results-card">
          <NotClaimNotice value={result} fileName={file?.name} onReset={clearAnalysis} />
        </Card>
      )}

      {status === 'completed' && !notClaim && (
        <Card className="di-results-card">
          <div className="di-card-heading">
            <div className="di-result-title">
              <span className="di-result-check"><CheckCircle2 size={18} aria-hidden="true" /></span>
              <div>
                <h2>Claim Overview</h2>
                <p>Extracted details from {file?.name ?? 'the uploaded document'}.</p>
              </div>
            </div>
            <StatusBadge tone="success">Completed</StatusBadge>
          </div>

          <ClaimResults value={result} />

        </Card>
      )}
    </div>
  )
}

function NotClaimNotice({
  value,
  fileName,
  onReset,
}: {
  value: unknown
  fileName?: string
  onReset: () => void
}) {
  const top = isRecord(value) ? value : {}
  const attrs = isRecord(top.claim_attributes) ? top.claim_attributes : {}
  // const purpose = typeof top.document_purpose === 'string' ? top.document_purpose.trim() : ''
  const summary = typeof attrs.document_summary === 'string' ? attrs.document_summary.trim() : ''

  return (
    <div className="di-not-claim" role="alert">
      <span className="di-not-claim__icon">
        <AlertCircle size={22} aria-hidden="true" />
      </span>
      <div className="di-not-claim__body">
        <h2>This doesn&apos;t appear to be a claim document</h2>
        <p>
          {fileName ? <strong>{fileName}</strong> : 'The uploaded file'} was not recognised as an
          inpatient or outpatient claim, hospital receipt, or prescription, so no claim details
          were extracted.
        </p>
        {/* {purpose && (
          <p className="di-not-claim__detected">
            Detected document type: <strong>{purpose}</strong>
          </p>
        )} */}
        {summary && <p className="di-not-claim__summary">{summary}</p>}
        <p className="di-not-claim__hint">
          Please upload a valid claim document to continue.
        </p>
        <button className="di-button di-button--primary" type="button" onClick={onReset}>
          <RefreshCw size={15} aria-hidden="true" />
          Upload a different document
        </button>
      </div>
    </div>
  )
}

function ClaimResults({ value }: { value: unknown }) {
  const attrs = getClaimAttributes(value)
  if (attrs === null) {
    return <p className="di-no-fields">The backend response did not include claim_attributes.</p>
  }

  const top = isRecord(value) ? value : {}
  const bills = Array.isArray(attrs.bill_summary_items) ? attrs.bill_summary_items.filter(isRecord) : []
  const meds = Array.isArray(attrs.prescription_items) ? attrs.prescription_items.filter(isRecord) : []

  const details: Array<[string, unknown]> = [
    ['Document Purpose', top.document_purpose],
    ['Document Type', attrs.document_type],
    ['Pages', top.page_count],
    ['Employee Name', attrs.employee_name],
    ['Claim Number', attrs.employee_claim_no],
    ['Contact Number', attrs.employee_contact_no],
    ['Submitted by employee', attrs.submitted_by_employee],
    ['Date Submitted', attrs.document_submitted_date],
    ['Date Received', attrs.document_received_date],
    ['Bills Attached', attrs.bills_attached],
    ['Prescription Attached', attrs.prescription_attached],
    ['Total bill amount', attrs.total_bill_amount],
  ]

  const amounts = bills.map((bill) => parseAmount(bill.amount))
  const itemised = amounts.every((a) => a !== null)
    ? amounts.reduce<number>((sum, a) => sum + (a ?? 0), 0)
    : null
  const stated = parseAmount(attrs.total_bill_amount)
  const mismatch = itemised !== null && stated !== null && Math.abs(itemised - stated) > 0.005

  return (
    <div className="qc-results">
      <dl className="qc-details">
        {details.map(([label, fieldValue]) => (
          <div key={label} className="qc-detail">
            <dt>{label}</dt>
<dd>
  {label === 'Total bill amount' && parseAmount(fieldValue) !== null
    ? `Rs. ${formatMoney(parseAmount(fieldValue) as number)}`
    : displayValue(fieldValue)}
</dd>
          </div>
        ))}
      </dl>

      {typeof attrs.document_summary === 'string' && attrs.document_summary && (
        <div className="qc-block">
          <h3>Summary</h3>
          <p className="qc-summary">{attrs.document_summary}</p>
        </div>
      )}

      <div className="qc-block">
        <h3><Receipt size={16} aria-hidden="true" /> Bill items <span className="qc-count">{bills.length}</span></h3>
        {bills.length === 0 ? (
          <p className="qc-empty">No bill items returned.</p>
        ) : (
          <div className="qc-table-wrap">
            <table className="qc-table">
              <thead>
                <tr>
                  <th scope="col" className="qc-idx">#</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="qc-num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill, index) => (
                  <tr key={index}>
                    <td className="qc-idx">{index + 1}</td>
                    <td>{displayValue(bill.description)}</td>
                    <td className="qc-num">
                      {amounts[index] !== null ? formatMoney(amounts[index] as number) : displayValue(bill.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {itemised !== null && (
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total</td>
                    <td className="qc-num">Rs. {formatMoney(itemised)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        {mismatch && (
          <p className="qc-warning" role="note">
            The line items add up to {formatMoney(itemised as number)}, but the stated total is{' '}
            {formatMoney(stated as number)}. Check the bills against the original document.
          </p>
        )}
      </div>

      <div className="qc-block">
        <h3><Pill size={16} aria-hidden="true" /> Prescription items <span className="qc-count">{meds.length}</span></h3>
        {meds.length === 0 ? (
          <p className="qc-empty">No prescription items returned.</p>
        ) : (
          <div className="qc-table-wrap">
            <table className="qc-table">
              <thead>
                <tr>
                  <th scope="col" className="qc-idx">#</th>
                  <th scope="col">Medicine</th>
                  <th scope="col">Dosage or frequency</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((med, index) => (
                  <tr key={index}>
                    <td className="qc-idx">{index + 1}</td>
                    <td>{displayValue(med.medicine_name)}</td>
                    <td>{displayValue(med.dosage_or_frequency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const cleaned = String(value).replace(/[^0-9.-]/g, '')
  if (!cleaned) return null
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

function isNotClaimDocument(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (value.is_customer_document === false) return true

  const attrs = value.claim_attributes
  const docType = isRecord(attrs) && typeof attrs.document_type === 'string'
    ? attrs.document_type.trim().toLowerCase()
    : ''
  return docType === 'not a claim'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
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