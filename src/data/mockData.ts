export type WorkflowStatus = 'Running' | 'Completed' | 'Needs review'

export type Workflow = {
  name: string
  category: string
  status: WorkflowStatus
  runTime: string
  lastRun: string
}

export const workflowData: Workflow[] = [
  {
    name: 'Claims intake processing',
    category: 'Claims',
    status: 'Running',
    runTime: '02m 18s',
    lastRun: 'Today, 10:42 AM',
  },
  {
    name: 'Policy renewal reminders',
    category: 'Policy servicing',
    status: 'Completed',
    runTime: '08m 06s',
    lastRun: 'Today, 10:30 AM',
  },
  {
    name: 'New business document review',
    category: 'New business',
    status: 'Needs review',
    runTime: '01m 54s',
    lastRun: 'Today, 10:18 AM',
  },
  {
    name: 'Premium reconciliation',
    category: 'Finance',
    status: 'Completed',
    runTime: '05m 22s',
    lastRun: 'Today, 09:56 AM',
  },
]

export const activityData = [
  { initials: 'CI', title: 'Claims intake processing', detail: 'Run completed', time: '10:42 AM', tone: 'teal' },
  { initials: 'PR', title: 'Policy renewal reminders', detail: 'Run completed', time: '10:30 AM', tone: 'burgundy' },
  { initials: 'NB', title: 'New business document review', detail: 'Review required', time: '10:18 AM', tone: 'amber' },
]

export const documentData = [
  { name: 'Sample policy application.pdf', type: 'Policy application', pages: 8, received: 'Today, 10:42 AM', status: 'Processed' },
  { name: 'Sample claim form.pdf', type: 'Claims form', pages: 4, received: 'Today, 10:18 AM', status: 'In review' },
  { name: 'Sample identity document.pdf', type: 'Identity document', pages: 2, received: 'Today, 09:56 AM', status: 'Processed' },
]
