import type {
  ChatRequest,
  ChatResponse,
  SessionCreateRequest,
  SessionCreateResponse,
  ConversationEndRequest,
} from '../../../shared/src/types'

const BASE = import.meta.env.VITE_API_BASE_URL

async function post<TBody, TResponse>(path: string, body: TBody): Promise<TResponse> {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API ${path} failed (${response.status}): ${text}`)
  }

  return response.json() as Promise<TResponse>
}

export async function chatRequest(body: ChatRequest): Promise<ChatResponse> {
  return post<ChatRequest, ChatResponse>('/api/v1/chat', body)
}

export async function createSession(body: SessionCreateRequest): Promise<SessionCreateResponse> {
  return post<SessionCreateRequest, SessionCreateResponse>('/api/v1/session', body)
}

export async function endConversation(body: ConversationEndRequest): Promise<void> {
  await post<ConversationEndRequest, { ok: boolean }>('/api/v1/conversation/end', body)
}
