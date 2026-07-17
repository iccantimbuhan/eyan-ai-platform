import { Cpu, HardDrive, Gauge, Layers, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { type ModelInfo } from '@/features/ai-chat/services/chat.service'

type ModelCardProps = {
  model: ModelInfo
  provider?: string
}

const providerColors: Record<string, string> = {
  ollama: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'lm studio': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  vllm: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  openai: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  anthropic: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`
  return `${bytes} B`
}

export function ModelCard({ model, provider = 'Ollama' }: ModelCardProps) {
  const colorClass =
    providerColors[provider.toLowerCase()] ??
    'bg-muted text-muted-foreground'

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{model.name}</CardTitle>
            <CardDescription className="mt-1 truncate">
              {model.family}
            </CardDescription>
          </div>
          <Badge className={colorClass}>{provider}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" />
            <span className="truncate">{model.parameters || '—'} params</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="h-3.5 w-3.5" />
            <span className="truncate">{formatSize(model.size)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            <span className="truncate">{model.quantization || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            <span className="truncate">{model.capabilities?.length ?? 0} caps</span>
          </div>
        </div>

        {/* Capabilities */}
        {model.capabilities && model.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {model.capabilities.map((cap) => (
              <Badge key={cap} variant="outline" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 pt-1">
          <Zap className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs text-muted-foreground">Available</span>
        </div>
      </CardContent>
    </Card>
  )
}
