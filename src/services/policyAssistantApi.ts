export interface PolicyAssistantRequest {
  sessionId: string
  prompt: string
}

export interface PolicyAssistantResponse {
  response: string
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
  if (!request.prompt.trim()) {
    throw new PolicyAssistantApiError(
      'invalid-request',
      'Enter a question before submitting.',
    )
  }

  if (!request.sessionId.trim()) {
    throw new PolicyAssistantApiError(
      'invalid-request',
      'The chat session could not be started. Please start a new chat.',
    )
  }

  let response: Response
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: request.sessionId,
        prompt: request.prompt,
      }),
    })
  } catch {
    throw new PolicyAssistantApiError(
      'network',
      'The Policy Assistant could not be reached. Check that the backend is running at 127.0.0.1:8000 and that the portal dev server is running with its API proxy enabled.',
    )
  }

  if (!response.ok) {
    throw new PolicyAssistantApiError(
      'server',
      `The Policy Assistant returned HTTP ${response.status}.`,
    )
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new PolicyAssistantApiError(
      'unexpected',
      'The Policy Assistant returned an invalid response. Please try again.',
    )
  }

  if (
    typeof data !== 'object' ||
    data === null ||
    !('response' in data) ||
    typeof data.response !== 'string'
  ) {
    throw new PolicyAssistantApiError(
      'unexpected',
      'The Policy Assistant response did not include a valid response field.',
    )
  }

  return { response: data.response }
}
