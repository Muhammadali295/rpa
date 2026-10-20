import { FileSearch, Files, LockKeyhole, ScanText } from 'lucide-react'
import { documentData } from '../data/mockData'
import { Alert, Card, PageHeader, SectionHeading, StatusBadge } from '../components/ui'

export function DocumentIntelligencePage() {
  return (
    <>
      <PageHeader
        eyebrow="OPERATIONS TOOLS"
        title="Document Intelligence"
        description="Review document processing activity and extraction status."
      />
      <Alert title="Development preview" icon={LockKeyhole}>
        Document ingestion and extraction are not connected. The examples below
        are illustrative mock records and do not represent real customer
        documents.
      </Alert>

      <div className="metrics-grid document-metrics">
        <DocumentMetric icon={Files} label="Documents processed" value="248" caption="Mock data this month" tone="teal" />
        <DocumentMetric icon={ScanText} label="Awaiting review" value="12" caption="Illustrative queue" tone="amber" />
        <DocumentMetric icon={FileSearch} label="Extraction accuracy" value="98.2%" caption="Sample metric only" tone="burgundy" />
      </div>

      <Card className="documents-card">
        <SectionHeading
          title="Recent documents"
          detail="Illustrative document activity — no files are attached"
          action={<StatusBadge tone="neutral">Mock data</StatusBadge>}
        />
        <div className="table-scroll">
          <table className="data-table documents-table">
            <thead>
              <tr>
                <th scope="col">DOCUMENT</th>
                <th scope="col">DOCUMENT TYPE</th>
                <th scope="col">PAGES</th>
                <th scope="col">RECEIVED</th>
                <th scope="col">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {documentData.map((document) => (
                <tr key={document.name}>
                  <td>
                    <span className="document-name">
                      <span className="document-icon"><Files size={17} aria-hidden="true" /></span>
                      <span className="table-primary">{document.name}</span>
                    </span>
                  </td>
                  <td>{document.type}</td>
                  <td>{document.pages}</td>
                  <td>{document.received}</td>
                  <td>
                    <StatusBadge tone={document.status === 'Processed' ? 'success' : 'warning'}>
                      {document.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function DocumentMetric({
  icon: Icon,
  label,
  value,
  caption,
  tone,
}: {
  icon: typeof Files
  label: string
  value: string
  caption: string
  tone: 'teal' | 'amber' | 'burgundy'
}) {
  return (
    <Card className="metric-card document-metric">
      <div className="metric-card__top">
        <span>{label}</span>
        <span className={`metric-icon metric-icon--${tone}`}><Icon size={18} aria-hidden="true" /></span>
      </div>
      <strong className="metric-card__value">{value}</strong>
      <span className="document-metric__caption">{caption}</span>
    </Card>
  )
}
