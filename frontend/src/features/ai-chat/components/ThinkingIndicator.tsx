import { Bot, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ThinkingIndicatorProps = {
  onCancel?: () => void
}

export function ThinkingIndicator({ onCancel }: ThinkingIndicatorProps) {
  return (
    <div className="group flex gap-3">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="h-4 w-4" />
      </div>

      {/* Thinking bubble */}
      <div className="max-w-[75%] space-y-1">
        <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Thinking</span>
            <span className="flex gap-0.5">
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
                style={{ animationDelay: '300ms' }}
              />
            </span>
          </div>
        </div>
        {onCancel && (
          <Button
            variant="destructive"
            size="sm"
            className="mt-2 h-7 gap-1 text-xs"
            onClick={onCancel}
          >
            <Square className="h-3 w-3" />
            Stop
          </Button>
        )}
      </div>
    </div>
  )
}
