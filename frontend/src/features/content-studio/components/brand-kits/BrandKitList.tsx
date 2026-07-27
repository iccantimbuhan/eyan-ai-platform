import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { useBrandKits } from '../../hooks/use-brand-kits'
import { BrandKitCard } from './BrandKitCard'
import { BrandKitFormDialog } from './BrandKitFormDialog'

interface BrandKitListProps {
  projectId: string
}

export function BrandKitList({ projectId }: BrandKitListProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const { data: brandKits, isLoading } = useBrandKits(projectId)

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>Brand Kits</h2>
          <p className='text-sm text-muted-foreground'>
            Reusable brand guidance content and image generation can reference.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='mr-2 h-4 w-4' />
          New Brand Kit
        </Button>
      </div>

      {isLoading && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {[1, 2, 3].map((key) => (
            <Skeleton key={key} className='h-40 w-full' />
          ))}
        </div>
      )}

      {!isLoading && (brandKits?.length ?? 0) === 0 && (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center'>
          <p className='font-medium'>No brand kits yet</p>
          <p className='text-sm text-muted-foreground'>
            Create a brand kit to keep generated content and images on-brand.
          </p>
        </div>
      )}

      {!isLoading && (brandKits?.length ?? 0) > 0 && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {brandKits?.map((brandKit) => (
            <BrandKitCard
              key={brandKit.id}
              brandKit={brandKit}
              projectId={projectId}
            />
          ))}
        </div>
      )}

      <BrandKitFormDialog
        projectId={projectId}
        mode='create'
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}
