import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type ChatInputProps = {
  onSend: (content: string) => void
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
}

export function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={cn(
        'flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm transition-shadow',
        'focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring/20'
      )}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message AI..."
        className={cn(
          'min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent px-3 py-2.5 shadow-none',
          'focus-visible:ring-0 focus-visible:ring-offset-0'
        )}
        rows={1}
        disabled={disabled}
        autoFocus
      />
      <Button
        size="icon"
        onClick={isStreaming ? onStop : handleSubmit}
        disabled={!isStreaming && (!value.trim() || disabled)}
        className="mb-0.5 shrink-0 rounded-lg"
        variant={isStreaming ? 'destructive' : 'default'}
      >
        {isStreaming ? <Square size={16} /> : <ArrowUp size={18} />}
      </Button>
    </div>
  )
}
