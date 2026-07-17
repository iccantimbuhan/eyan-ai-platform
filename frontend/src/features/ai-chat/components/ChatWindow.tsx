import { useCallback, useEffect, useRef } from 'react'
import { Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ThinkingIndicator } from './ThinkingIndicator'
import { useAiChatStore } from '../store'

const SUGGESTED_PROMPTS = [
  {
    title: 'Explain a concept',
    prompt: 'Explain how large language models work in simple terms.',
    icon: '💡',
  },
  {
    title: 'Write code',
    prompt:
      'Write a Python function that calculates the Fibonacci sequence recursively and iteratively.',
    icon: '💻',
  },
  {
    title: 'Brainstorm ideas',
    prompt: 'What are some creative ways to use AI in education?',
    icon: '🧠',
  },
]

export function ChatWindow() {
  const {
    activeConversationId,
    conversations,
    addMessage,
    sendStreamChat,
    cancelStream,
    isSending,
    isStreaming,
  } = useAiChatStore()

  const conversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)

  // ====================================================
  // TEMPORARY DEBUG
  // Auto-scroll DISABLED
  // ====================================================
  useEffect(() => {
    // Disabled for debugging
  }, [])

  // Track user scroll position
  const handleViewportScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150

    userScrolledUp.current = !isNearBottom
  }, [])

  const handleSend = (content: string) => {
    if (!activeConversationId) return
    addMessage({ role: 'user', content })
    sendStreamChat(activeConversationId, content)
  }

  const handleSuggestedPrompt = (prompt: string) => {
    handleSend(prompt)
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-border bg-muted/50">
            <Bot className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No conversation selected</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            Select a chat from the sidebar or start a new conversation.
          </p>
        </div>
      </div>
    )
  }

  const isEmpty = conversation.messages.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleViewportScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
          {isEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-border bg-muted/50">
                <Bot className="size-8 text-muted-foreground" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-semibold">
                  How can I help you today?
                </h2>

                <p className="text-sm text-muted-foreground">
                  Ask me anything or try one of these suggestions.
                </p>
              </div>

              <div className="grid w-full max-w-lg gap-3 sm:grid-cols-3">
                {SUGGESTED_PROMPTS.map((s) => (
                  <Button
                    key={s.title}
                    variant="outline"
                    className="flex h-auto flex-col items-start gap-1.5 p-4 text-start"
                    onClick={() => handleSuggestedPrompt(s.prompt)}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-sm font-medium">{s.title}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {conversation.messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isSending && (
                <ThinkingIndicator onCancel={cancelStream} />
              )}
            </>
          )}
        </div>
      </div>

      <div className="border-t bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <ChatInput
            onSend={handleSend}
            onStop={cancelStream}
            disabled={isSending}
            isStreaming={isStreaming}
          />

          <p className="mt-2 text-center text-xs text-muted-foreground/60">
            Powered by Ollama • Responses may be inaccurate
          </p>
        </div>
      </div>
    </div>
  )
}
