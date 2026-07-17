import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { type AiConversation, type AiMessage } from './types'
import {
  chat as chatApiCall,
  streamChat,
  type BackendMessage,
} from './services/chat.service'
import { SYSTEM_PROMPT } from './config/system-prompt'

let idCounter = 0
const uid = () => `ai-${++idCounter}-${Date.now()}`

const generateTitle = (content: string): string => {
  const trimmed = content.trim()
  if (trimmed.length <= 40) return trimmed
  return trimmed.slice(0, 40) + '...'
}

// Migration: ensure every conversation has updatedAt
function migrateState(state: unknown): {
  conversations: AiConversation[]
  activeConversationId: string | null
  isSending: boolean
  isStreaming: boolean
  pendingAssistantId: string | null
} {
  if (!state || typeof state !== 'object') {
    return {
      conversations: [],
      activeConversationId: null,
      isSending: false,
      isStreaming: false,
      pendingAssistantId: null,
    }
  }

  const s = state as Record<string, unknown>
  const conversations = Array.isArray(s.conversations)
    ? (s.conversations as Partial<AiConversation>[]).map((c) => {
        const toDate = (v: unknown): Date =>
          v instanceof Date ? v : new Date(String(v))
        return {
          id: c.id ?? uid(),
          title: c.title ?? 'New Chat',
          messages: (c.messages ?? []) as AiMessage[],
          createdAt: c.createdAt ? toDate(c.createdAt) : new Date(),
          updatedAt: c.updatedAt
            ? toDate(c.updatedAt)
            : c.createdAt
              ? toDate(c.createdAt)
              : new Date(),
        }
      })
    : []

  return {
    conversations,
    activeConversationId:
      typeof s.activeConversationId === 'string'
        ? s.activeConversationId
        : conversations.length > 0
          ? conversations[0].id
          : null,
    isSending: false,
    isStreaming: false,
    pendingAssistantId: null,
  }
}

interface AiChatState {
  conversations: AiConversation[]
  activeConversationId: string | null
  isSending: boolean
  isStreaming: boolean
  streamAbortController: AbortController | null
  pendingAssistantId: string | null

  addConversation: () => void
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string) => void
  addMessage: (message: Omit<AiMessage, 'id' | 'timestamp'>) => void
  sendChat: (conversationId: string, content: string) => Promise<void>
  sendStreamChat: (conversationId: string, content: string) => Promise<void>
  cancelStream: () => void
}

const starterConversation = (): AiConversation => ({
  id: uid(),
  title: 'New Chat',
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
})

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isSending: false,
      isStreaming: false,
      streamAbortController: null,
      pendingAssistantId: null,

      addConversation: () =>
        set((state) => {
          const next = starterConversation()
          return {
            conversations: [next, ...state.conversations],
            activeConversationId: next.id,
          }
        }),

      deleteConversation: (id) =>
        set((state) => {
          const next = state.conversations.filter((c) => c.id !== id)
          return {
            conversations: next,
            activeConversationId:
              state.activeConversationId === id
                ? (next[0]?.id ?? null)
                : state.activeConversationId,
          }
        }),

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addMessage: ({ role, content }) =>
        set((state) => {
          if (!state.activeConversationId) return state

          const msg: AiMessage = {
            id: uid(),
            role,
            content,
            timestamp: new Date(),
          }

          return {
            conversations: state.conversations.map((c) =>
              c.id === state.activeConversationId
                ? {
                    ...c,
                    messages: [...c.messages, msg],
                    title:
                      c.title === 'New Chat' && role === 'user'
                        ? generateTitle(content)
                        : c.title,
                    updatedAt: new Date(),
                  }
                : c
            ),
          }
        }),

      sendChat: async (conversationId, content) => {
        const assistantMsgId = uid()

        // Build messages payload from conversation history
        const conversation = get().conversations.find(
          (c) => c.id === conversationId
        )
        const historyMessages: BackendMessage[] = conversation
          ? conversation.messages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }))
          : []
        const messagesPayload: BackendMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...historyMessages,
          { role: 'user', content },
        ]

        set((state) => ({
          isSending: true,
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: assistantMsgId,
                      role: 'assistant' as const,
                      content: '',
                      timestamp: new Date(),
                    },
                  ],
                  updatedAt: new Date(),
                }
              : c
          ),
        }))

        try {
          const result = await chatApiCall(messagesPayload)

          set((state) => ({
            isSending: false,
            conversations: state.conversations.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: result.response }
                        : m
                    ),
                    updatedAt: new Date(),
                  }
                : c
            ),
          }))
        } catch (error) {
          let errMsg = 'Failed to get a response. Please try again.'

          if (error instanceof AxiosError) {
            if (error.response?.status === 400) {
              errMsg = error.response.data?.error || 'Invalid message.'
            } else if (error.response?.status === 503) {
              errMsg =
                'AI service unavailable. Ensure Ollama is running and the backend is connected.'
            } else if (error.response && error.response.status >= 500) {
              errMsg = 'Internal server error. Please try again later.'
            } else if (error.code === 'ECONNREFUSED' || !error.response) {
              errMsg =
                'Cannot connect to backend. Ensure the server is running.'
            }
          }

          set((state) => ({
            isSending: false,
            conversations: state.conversations.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: errMsg,
                            isError: true,
                          }
                        : m
                    ),
                    updatedAt: new Date(),
                  }
                : c
            ),
          }))

          toast.error('Chat Error', { description: errMsg })
        }
      },

      sendStreamChat: async (conversationId, content) => {
        const assistantMsgId = uid()
        const controller = new AbortController()

        // Build messages payload from conversation history
        const conversation = get().conversations.find(
          (c) => c.id === conversationId
        )
        const historyMessages: BackendMessage[] = conversation
          ? conversation.messages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }))
          : []
        const messagesPayload: BackendMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...historyMessages,
          { role: 'user', content },
        ]

        set((state) => ({
          isSending: true,
          isStreaming: true,
          streamAbortController: controller,
          pendingAssistantId: assistantMsgId,
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: assistantMsgId,
                      role: 'assistant' as const,
                      content: '',
                      timestamp: new Date(),
                    },
                  ],
                  updatedAt: new Date(),
                }
              : c
          ),
        }))

        // Safety timeout: if stream doesn't complete within 5 minutes, force cleanup
        const safetyTimeout = setTimeout(() => {
          set((state) => {
            // Only cleanup if still streaming this message
            if (state.pendingAssistantId === assistantMsgId) {
              return {
                isSending: false,
                isStreaming: false,
                streamAbortController: null,
                pendingAssistantId: null,
                conversations: state.conversations.map((c) =>
                  c.id === conversationId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantMsgId
                            ? m.content === ''
                              ? {
                                  ...m,
                                  content: 'Response timed out. Please try again.',
                                  isError: true,
                                }
                              : m
                            : m
                        ),
                        updatedAt: new Date(),
                      }
                    : c
                ),
              }
            }
            return state
          })
          controller.abort()
        }, 5 * 60 * 1000)

        await streamChat(
          messagesPayload,
          (chunkContent, done) => {
            clearTimeout(safetyTimeout)
            set((state) => ({
              conversations: state.conversations.map((c) =>
                c.id === conversationId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId
                          ? {
                              ...m,
                              content: m.content + chunkContent,
                            }
                          : m
                      ),
                    }
                  : c
              ),
            }))

            if (done) {
              set({ isSending: false, isStreaming: false, streamAbortController: null, pendingAssistantId: null })
            }
          },
          (err) => {
            clearTimeout(safetyTimeout)
            set((state) => ({
              isSending: false,
              isStreaming: false,
              streamAbortController: null,
              pendingAssistantId: null,
              conversations: state.conversations.map((c) =>
                c.id === conversationId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId
                          ? {
                              ...m,
                              content: m.content || err,
                              isError: !m.content,
                            }
                          : m
                      ),
                      updatedAt: new Date(),
                    }
                  : c
              ),
            }))

            if (err !== 'Stream interrupted. Please try again.') {
              toast.error('Stream Error', { description: err })
            }
          },
          controller.signal
        )
      },

      cancelStream: () => {
        const { streamAbortController, pendingAssistantId } = get()
        if (streamAbortController) {
          streamAbortController.abort()
        }
        // Clean up any pending state
        if (pendingAssistantId) {
          set((state) => ({
            isSending: false,
            isStreaming: false,
            streamAbortController: null,
            pendingAssistantId: null,
            conversations: state.conversations.map((c) =>
              c.id === state.activeConversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === pendingAssistantId
                        ? m.content === ''
                          ? { ...m, content: '_Response cancelled._', isError: true }
                          : m
                        : m
                    ),
                    updatedAt: new Date(),
                  }
                : c
            ),
          }))
        } else {
          set({
            isSending: false,
            isStreaming: false,
            streamAbortController: null,
          })
        }
      },
    }),
    {
      name: 'ai-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
      merge: (persistedState, currentState) => {
        const migrated = migrateState(persistedState)
        return {
          ...currentState,
          ...migrated,
          conversations: migrated.conversations.map((c) => ({
            ...c,
            createdAt:
              c.createdAt instanceof Date
                ? c.createdAt
                : new Date(c.createdAt as unknown as string),
            updatedAt:
              c.updatedAt instanceof Date
                ? c.updatedAt
                : new Date(c.updatedAt as unknown as string),
            messages: c.messages.map((m) => ({
              ...m,
              timestamp:
                m.timestamp instanceof Date
                  ? m.timestamp
                  : new Date(m.timestamp as unknown as string),
            })),
          })),
        }
      },
    }
  )
)
