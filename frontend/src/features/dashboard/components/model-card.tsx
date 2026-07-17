import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type ModelCardProps = {
  name: string
  provider: string
  status: 'loaded' | 'available' | 'unavailable'
  icon?: ReactNode
  className?: string
}

const statusVariant: Record<ModelCardProps['status'], 'default' | 'secondary' | 'outline'> = {
  loaded: 'default',
  available: 'secondary',
  unavailable: 'outline',
}

export function ModelCard({
  name,
  provider,
  status,
  icon,
  className,
}: ModelCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Active Model</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        {icon && <span className="h-8 w-8 text-muted-foreground">{icon}</span>}
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-lg font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{provider}</p>
        </div>
        <Badge variant={statusVariant[status]}>
          {status}
        </Badge>
      </CardContent>
    </Card>
  )
}
