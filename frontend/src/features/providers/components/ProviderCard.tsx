import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type ProviderStatus = 'connected' | 'disconnected' | 'coming-soon' | 'error'

export interface ProviderInfo {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  status: ProviderStatus
  endpoint?: string
  currentModel?: string
  installedModels?: number
  version?: string
}

type ProviderCardProps = {
  provider: ProviderInfo
  onRefresh?: () => void
  onTestConnection?: () => void
  onConfigure?: () => void
  className?: string
}

const statusConfig: Record<ProviderStatus, { badge: string; label: string; dot: string }> = {
  connected: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', label: 'Connected', dot: 'bg-emerald-500' },
  disconnected: { badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', label: 'Disconnected', dot: 'bg-red-500' },
  'coming-soon': { badge: 'bg-muted text-muted-foreground', label: 'Coming Soon', dot: 'bg-muted-foreground/50' },
  error: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', label: 'Error', dot: 'bg-amber-500' },
}

export function ProviderCard({ provider, onRefresh, className }: ProviderCardProps) {
  const isDisabled = provider.status === 'coming-soon'
  const cfg = statusConfig[provider.status]

  return (
    <Card
      className={cn(
        'flex flex-col transition-opacity',
        isDisabled && 'opacity-60',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border',
              isDisabled ? 'bg-muted' : 'bg-background'
            )}>
              {provider.icon}
            </div>
            <div>
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <CardDescription className="mt-0.5">{provider.description}</CardDescription>
            </div>
          </div>
          <Badge className={cn('gap-1.5', cfg.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {isDisabled ? (
          <p className="text-sm text-muted-foreground">
            {provider.name} support is coming soon. Stay tuned!
          </p>
        ) : (
          <>
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Endpoint</p>
                <p className="truncate font-mono text-xs">{provider.endpoint ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Model</p>
                <p className="truncate text-xs">{provider.currentModel ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Installed Models</p>
                <p className="text-xs">{provider.installedModels ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="text-xs">{provider.version ?? '—'}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {onRefresh && (
                <Button variant="outline" size="sm" className="flex-1" onClick={onRefresh}>
                  Refresh
                </Button>
              )}
              <Button variant="outline" size="sm" className="flex-1" disabled>
                Test Connection
              </Button>
              <Button variant="outline" size="sm" className="flex-1" disabled>
                Configure
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
