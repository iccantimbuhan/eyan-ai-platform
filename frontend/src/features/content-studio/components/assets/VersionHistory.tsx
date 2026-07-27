import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { useAssetVersions } from '../../hooks/use-asset-versions'
import type { AssetType } from '../../types/asset'
import { VersionCompareDialog } from './VersionCompareDialog'

interface VersionHistoryProps {
  assetType: AssetType
  sourceId: string
}

export function VersionHistory({ assetType, sourceId }: VersionHistoryProps) {
  const { data: versions, isLoading, isError } = useAssetVersions(assetType, sourceId)
  const [compareOpen, setCompareOpen] = useState(false)

  return (
    <section className='space-y-2'>
      <h3 className='text-sm font-semibold'>Version History</h3>

      {isLoading && (
        <div role='status' aria-label='Loading version history'>
          <Skeleton className='h-16 w-full' />
        </div>
      )}

      {isError && (
        <p className='text-sm text-destructive'>Failed to load version history.</p>
      )}

      {!isLoading && !isError && versions && (
        <>
          <div className='space-y-2'>
            {versions.map((version) => (
              <div
                key={version.id}
                className='flex flex-wrap items-center justify-between gap-1 rounded-md border p-2 text-sm'
              >
                <span className='font-medium'>v{version.versionNumber}</span>
                <span className='text-muted-foreground'>
                  {version.provider ?? '—'}
                  {version.model ? ` · ${version.model}` : ''}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {new Date(version.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className='flex gap-2'>
            <Button
              size='sm'
              variant='outline'
              disabled={versions.length < 2}
              onClick={() => setCompareOpen(true)}
            >
              Compare
            </Button>

            {/* Future-ready per the brief — not wired this sprint. */}
            <Button size='sm' variant='outline' disabled title='Coming soon'>
              Restore
            </Button>
          </div>

          <VersionCompareDialog
            assetType={assetType}
            versions={versions}
            open={compareOpen}
            onOpenChange={setCompareOpen}
          />
        </>
      )}
    </section>
  )
}
