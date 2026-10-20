export interface PolicyAssistantRequest {
  question: string
}

export interface PolicyReference {
  documentTitle?: string
  section?: string
  page?: number
}

export interface PolicyAssistantResponse {
  answer: string
  supported?: boolean
  references?: PolicyReference[]
}

export type PolicyAssistantApiErrorCode =
  | 'not-configured'
  | 'network'
  | 'invalid-request'
  | 'server'
  | 'unexpected'

export class PolicyAssistantApiError extends Error {
  constructor(
    readonly code: PolicyAssistantApiErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'PolicyAssistantApiError'
  }
}

export async function askPolicyAssistant(
  request: PolicyAssistantRequest,
): Promise<PolicyAssistantResponse> {
  if (!request.question.trim()) {
    throw new PolicyAssistantApiError(
      'invalid-request',
      'Enter a question before submitting.',
    )
  }

  throw new PolicyAssistantApiError(
    'not-configured',
    'The Policy Assistant backend contract has not been provided.',
  )
}
