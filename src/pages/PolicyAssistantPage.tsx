import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Bot, CircleAlert, Plus, Send } from 'lucide-react'
import {
  askPolicyAssistant,
  isChatHistory,
  PolicyAssistantApiError,
  type ChatTurn,
  type PolicyAssistantResponse,
} from '../services/policyAssistantApi'

const HISTORY_KEY = 'jubilee-chat-history'

type ConversationEntry = {
  id: number
  question: string
  status: 'pending' | 'answered' | 'error'
  response?: PolicyAssistantResponse
  error?: string
}

export function PolicyAssistantPage() {
  const [savedChat] = useState(readChatHistory)
  const [history, setHistory] = useState(savedChat.history)
  const [storageError, setStorageError] = useState(savedChat.error)
  const [question, setQuestion] = useState('')
  const [conversation, setConversation] = useState<ConversationEntry[]>(
    () => createConversationEntries(savedChat.history),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const entryIdRef = useRef(savedChat.history.filter((turn) => turn.role === 'user').length)
  const inFlightRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const conversationElement = conversationRef.current
    if (conversationElement) {
      conversationElement.scrollTo({
        top: conversationElement.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [conversation])

  async function sendQuestion(submittedQuestion: string, entryId?: number) {
    if (!submittedQuestion.trim() || inFlightRef.current) return

    const id = entryId ?? ++entryIdRef.current
    inFlightRef.current = true
    setIsSubmitting(true)

    if (entryId === undefined) {
      setConversation((entries) => [
        ...entries,
        { id, question: submittedQuestion, status: 'pending' },
      ])
    } else {
      setConversation((entries) =>
        entries.map((entry) =>
          entry.id === id
            ? { ...entry, status: 'pending', response: undefined, error: undefined }
            : entry,
        ),
      )
    }

    try {
      const response = await askPolicyAssistant({
        prompt: submittedQuestion,
        history,
      })
      setHistory(response.history)
      try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(response.history))
        setStorageError('')
      } catch {
        setStorageError('Chat history could not be saved for this tab.')
      }
      setConversation((entries) =>
        entries.map((entry) =>
          entry.id === id ? { ...entry, status: 'answered', response } : entry,
        ),
      )
    } catch (error) {
      const message = getErrorMessage(error)
      setConversation((entries) =>
        entries.map((entry) =>
          entry.id === id ? { ...entry, status: 'error', error: message } : entry,
        ),
      )
    } finally {
      inFlightRef.current = false
      setIsSubmitting(false)
    }
  }

  function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const submittedQuestion = question.trim()
    if (!submittedQuestion || inFlightRef.current) return
    setQuestion('')
    if (textareaRef.current) textareaRef.current.style.height = ''
    void sendQuestion(submittedQuestion)
  }

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  function startNewChat() {
    if (inFlightRef.current) return
    setConversation([])
    setHistory([])
    setQuestion('')
    try {
      sessionStorage.removeItem(HISTORY_KEY)
      setStorageError('')
    } catch {
      setStorageError('The saved chat history could not be cleared for this tab.')
    }
    textareaRef.current?.focus()
  }

  const canSend = Boolean(question.trim()) && !isSubmitting

  return (
    <div className="pa-page">
      <header className="pa-topbar">
        <div className="pa-topbar__heading">
          <h1>Policy Assistant</h1>
        </div>
        <button
          className="pa-new-chat"
          onClick={startNewChat}
          disabled={isSubmitting}
        >
          <Plus size={18} aria-hidden="true" />
          <span>New chat</span>
        </button>
      </header>

      <section className="pa-content" aria-label="Policy Assistant conversation">
        {storageError && (
          <div className="pa-error" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <p>{storageError}</p>
          </div>
        )}
        {conversation.length === 0 ? (
          <div className="pa-welcome">
            <span className="pa-welcome__mark" aria-hidden="true">
              <Bot size={22} />
            </span>
            <h2>How can I help you today?</h2>
            <p>Ask anything about Jubilee Life IT and Information Security policies.</p>
          </div>
        ) : (
          <div className="pa-transcript" ref={conversationRef} aria-live="polite">
            {conversation.map((entry) => (
              <article className="pa-exchange" key={entry.id}>
                <div className="pa-user-message">
                  <p>{entry.question}</p>
                </div>
                <div className="pa-assistant-message">
                  <span className="pa-assistant-message__icon" aria-hidden="true">
                    <Bot size={18} />
                  </span>
                  <div className="pa-assistant-message__body">
                    {entry.status === 'pending' && (
                      <span className="pa-loading" role="status">
                        <span className="pa-loading__spinner" aria-hidden="true" />
                        Thinking…
                      </span>
                    )}
                    {entry.status === 'error' && (
                      <div className="pa-error" role="alert">
                        <CircleAlert size={17} aria-hidden="true" />
                        <p>{entry.error}</p>
                        <button
                          type="button"
                          className="pa-retry-button"
                          disabled={isSubmitting}
                          onClick={() => void sendQuestion(entry.question, entry.id)}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    {entry.response && (
                      <ResponseContent response={entry.response} />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="pa-composer-area">
          <form className="pa-composer" onSubmit={handleSubmit}>
            <label className="pa-visually-hidden" htmlFor="policy-question">
              Ask a question about Jubilee Life policies
            </label>
            <textarea
              ref={textareaRef}
              id="policy-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleQuestionKeyDown}
              onInput={(event) => {
                event.currentTarget.style.height = 'auto'
                event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 180)}px`
              }}
              placeholder="Ask a question"
              rows={1}
              maxLength={4000}
              disabled={isSubmitting}
            />
            <div className="pa-composer__footer">
              <span>Enter to send · Shift+Enter for a new line</span>
              <button
                className="pa-send-button"
                type="submit"
                aria-label={isSubmitting ? 'Sending question' : 'Send question'}
                disabled={!canSend}
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

function ResponseContent({ response }: { response: PolicyAssistantResponse }) {
  const answer = response.response.trim()

  return (
    <>
      {answer ? (
        <MarkdownContent text={answer} />
      ) : (
        <p className="pa-answer-notice">
          The policy service returned an empty response. Please try again or contact your administrator.
        </p>
      )}
    </>
  )
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split(/\r?\n/)
  const blocks = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) {
      index += 1
      continue
    }

    if (line.startsWith('```')) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      index += 1
      blocks.push(
        <pre key={`code-${index}`}><code>{codeLines.join('\n')}</code></pre>,
      )
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      const Heading = `h${heading[1].length}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      blocks.push(<Heading key={`heading-${index}`}><InlineMarkdown text={heading[2]} /></Heading>)
      index += 1
      continue
    }

    const unordered = /^[-*+]\s+(.+)$/.exec(line)
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line)
    if (unordered || ordered) {
      const orderedList = Boolean(ordered)
      const items = []
      while (index < lines.length) {
        const match = orderedList
          ? /^\d+[.)]\s+(.+)$/.exec(lines[index].trim())
          : /^[-*+]\s+(.+)$/.exec(lines[index].trim())
        if (!match) break
        items.push(<li key={`item-${index}`}><InlineMarkdown text={match[1]} /></li>)
        index += 1
      }
      blocks.push(orderedList ? <ol key={`list-${index}`}>{items}</ol> : <ul key={`list-${index}`}>{items}</ul>)
      continue
    }

    const paragraph = [line]
    index += 1
    while (index < lines.length && lines[index].trim() && !/^(#{1,6}\s+|```|[-*+]\s+|\d+[.)]\s+)/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push(<p key={`paragraph-${index}`}><InlineMarkdown text={paragraph.join(' ')} /></p>)
  }

  return <div className="pa-markdown">{blocks}</div>
}

function InlineMarkdown({ text }: { text: string }) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return (
    <>
      {tokens.map((token, index) => {
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={index}>{token.slice(2, -2)}</strong>
        }
        if (token.startsWith('`') && token.endsWith('`')) {
          return <code key={index}>{token.slice(1, -1)}</code>
        }
        if (token.startsWith('*') && token.endsWith('*')) {
          return <em key={index}>{token.slice(1, -1)}</em>
        }
        return token
      })}
    </>
  )
}

function readChatHistory(): { history: ChatTurn[]; error: string } {
  try {
    const value = sessionStorage.getItem(HISTORY_KEY)
    if (!value) return { history: [], error: '' }

    const parsed: unknown = JSON.parse(value)
    if (!isChatHistory(parsed)) {
      return { history: [], error: 'The saved chat history is invalid and could not be restored.' }
    }
    return { history: parsed, error: '' }
  } catch {
    return { history: [], error: 'The saved chat history could not be loaded for this tab.' }
  }
}

function createConversationEntries(history: ChatTurn[]): ConversationEntry[] {
  const entries: ConversationEntry[] = []
  let id = 0

  for (const turn of history) {
    if (turn.role === 'user') {
      entries.push({ id: ++id, question: turn.text, status: 'pending' })
      continue
    }

    const pendingEntry = [...entries].reverse().find((entry) => entry.status === 'pending')
    if (pendingEntry) {
      pendingEntry.status = 'answered'
      pendingEntry.response = { response: turn.text, history }
    }
  }

  return entries
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof PolicyAssistantApiError)) {
    return 'An unexpected error occurred. Please try again.'
  }

  switch (error.code) {
    case 'not-configured':
      return 'The Policy Assistant service is not connected yet. No question was sent. Please try again after the backend is configured.'
    case 'network':
      return error.message
    case 'invalid-request':
      return error.message || 'The question could not be submitted. Please review it and try again.'
    case 'server':
      return 'The Policy Assistant encountered a server error. Please try again later.'
    case 'unexpected':
      return 'An unexpected error occurred. Please try again.'
  }
}
