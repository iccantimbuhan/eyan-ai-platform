import { Separator } from '@/components/ui/separator'
import { Breadcrumbs, type BreadcrumbItemData } from '@/components/breadcrumbs'

type ContentSectionProps = {
  title: string
  desc: string
  breadcrumbs?: BreadcrumbItemData[]
  children: React.JSX.Element
}

export function ContentSection({
  title,
  desc,
  breadcrumbs,
  children,
}: ContentSectionProps) {
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none space-y-2'>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}
        <div>
          <h3 className='text-lg font-medium'>{title}</h3>
          <p className='text-sm text-muted-foreground'>{desc}</p>
        </div>
      </div>
      <Separator className='my-4 flex-none' />
      <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
        <div className='-mx-1 px-1.5 lg:max-w-xl'>{children}</div>
      </div>
    </div>
  )
}
