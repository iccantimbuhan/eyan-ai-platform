import { api } from '@/services/api'

export interface ChatResponse {
  model: string
  response: string
  createdAt: string
}

export interface BackendMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface HealthResponse {
  status: string
  service: string
  version: string
  provider: string
  model: string
  timestamp: string
}

export interface ModelInfo {
  name: string
  family: string
  parameters: string
  quantization: string
  size: number
  capabilities: string[]
}

export interface ModelsResponse {
  count: number
  models: ModelInfo[]
}

export async function chat(messages: BackendMessage[]): Promise<ChatResponse> {
  const res = await api.post('/chat', { messages })
  return res.data.data as ChatResponse
}

export interface StreamChunk {
  model?: string
  message?: {
    role: string
    content: string
  }
  done: boolean
}

export async function streamChat(
  messages: BackendMessage[],
  onChunk: (content: string, done: boolean) => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const baseURL = api.defaults.baseURL ?? ''
  try {
    const response = await fetch(`${baseURL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    })

    if (!response.ok) {
      if (response.status === 400) {
        onError('Invalid message.')
      } else if (response.status === 503) {
        onError('AI service unavailable. Ensure Ollama is running.')
      } else {
        onError('Stream failed. Please try again.')
      }
      return
    }

    if (!response.body) {
      onError('Stream not supported by this browser.')
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        const remaining = buffer.trim()
        if (remaining) {
          try {
            const parsed: StreamChunk = JSON.parse(remaining)
            onChunk(parsed.message?.content ?? '', true)
          } catch {
            // Incomplete final chunk
          }
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const parsed: StreamChunk = JSON.parse(trimmed)
          const content = parsed.message?.content ?? ''
          onChunk(content, parsed.done)
        } catch {
          // Skip unparseable lines
        }
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      onError('Cannot connect to backend.')
    } else {
      onError('Stream interrupted. Please try again.')
    }
  }
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await api.get('/health')
  return res.data.data as HealthResponse
}

export async function getModels(): Promise<ModelsResponse> {
  const res = await api.get('/models')
  return res.data.data as ModelsResponse
}
