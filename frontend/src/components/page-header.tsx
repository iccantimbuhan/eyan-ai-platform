import type { ReactNode } from 'react'
import { BackButton } from '@/components/back-button'
import { Breadcrumbs, type BreadcrumbItemData } from '@/components/breadcrumbs'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  backTo?: string
  backLabel?: string
  breadcrumbs?: BreadcrumbItemData[]
  actions?: ReactNode
}

export function PageHeader({
  title,
  description,
  backTo,
  backLabel,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className='space-y-2'>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}
      {backTo && <BackButton to={backTo} label={backLabel} />}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>{title}</h1>
          {description && (
            <p className='text-muted-foreground'>{description}</p>
          )}
        </div>
        {actions && <div className='flex shrink-0 gap-2'>{actions}</div>}
      </div>
    </div>
  )
}
