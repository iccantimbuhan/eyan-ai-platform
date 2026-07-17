export type MessageRole = 'user' | 'assistant'

export interface AiMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  isError?: boolean
}

export interface AiConversation {
  id: string
  title: string
  messages: AiMessage[]
  createdAt: Date
  updatedAt: Date
}
