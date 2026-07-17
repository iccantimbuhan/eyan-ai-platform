import { cn } from '@/lib/utils'

type StatusBadgeProps = {
  status: 'connected' | 'disconnected' | 'warning'
  label: string
  className?: string
}

const statusConfig: Record<StatusBadgeProps['status'], { dot: string }> = {
  connected: { dot: 'bg-emerald-500' },
  disconnected: { dot: 'bg-red-500' },
  warning: { dot: 'bg-amber-500' },
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-card px-3 py-2',
        className
      )}
    >
      <span
        className={cn('h-2 w-2 rounded-full', statusConfig[status].dot)}
      />
      <span className="text-sm">{label}</span>
    </div>
  )
}
