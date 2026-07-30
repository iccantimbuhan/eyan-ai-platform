import { useEffect, useMemo, useState } from 'react'
import { LibraryBig, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { assetsApi } from '../../api/assets.api'
import { downloadAsset, exportAssetsAsJson, downloadBlob } from '../../lib/asset-export'
import { useAssets } from '../../hooks/use-assets'
import { useBatchAssetAction } from '../../hooks/use-batch-asset-action'
import type { AssetSummary, BatchAssetItemRef } from '../../types/asset'
import { AssetBulkActionsBar } from './AssetBulkActionsBar'
import { AssetCard } from './AssetCard'
import { AssetDetailSheet } from './AssetDetailSheet'
import { AssetPagination } from './AssetPagination'
import { AssetToolbar, type AssetFilters } from './AssetToolbar'
import { NewPromptTemplateDialog } from './NewPromptTemplateDialog'

const PAGE_SIZE = 12
const SEARCH_DEBOUNCE_MS = 300

function assetKey(item: BatchAssetItemRef): string {
  return `${item.assetType}:${item.sourceId}`
}

interface AssetLibraryProps {
  projectId: string
}

export function AssetLibrary({ projectId }: AssetLibraryProps) {
  const [filters, setFilters] = useState<AssetFilters>({ search: '' })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Map<string, BatchAssetItemRef>>(new Map())
  const [viewingAsset, setViewingAsset] = useState<AssetSummary | null>(null)
  const [newPromptOpen, setNewPromptOpen] = useState(false)
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [filters.search])

  // Reset to page 1 whenever the effective query changes, following React's
  // "adjusting state when a prop changes" pattern (a synchronous setState
  // during render, not inside an effect) rather than an effect that would
  // trigger a second, cascading render.
  const queryKey = `${debouncedSearch}|${filters.type ?? ''}|${filters.status ?? ''}|${filters.provider ?? ''}`
  const [appliedQueryKey, setAppliedQueryKey] = useState(queryKey)
  if (queryKey !== appliedQueryKey) {
    setAppliedQueryKey(queryKey)
    setPage(1)
  }

  const assets = useAssets(projectId, {
    search: debouncedSearch || undefined,
    type: filters.type,
    status: filters.status,
    provider: filters.provider,
    page,
    pageSize: PAGE_SIZE,
  })
  const batchAction = useBatchAssetAction(projectId)

  const providerOptions = useMemo(() => {
    const providers = new Set<string>()
    for (const item of assets.data?.items ?? []) {
      if (item.provider) providers.add(item.provider)
    }
    return Array.from(providers).sort()
  }, [assets.data?.items])

  const selectedItems = Array.from(selected.values())

  function toggleSelect(item: AssetSummary, checked: boolean) {
    setSelected((prev) => {
      const next = new Map(prev)
      const ref = { assetType: item.assetType, sourceId: item.id }
      const key = assetKey(ref)
      if (checked) next.set(key, ref)
      else next.delete(key)
      return next
    })
  }

  function runBatchAction(action: 'approve' | 'reject') {
    batchAction.mutate(
      { items: selectedItems, action },
      {
        onSuccess: (results) => {
          const failed = results.filter((r) => !r.success).length
          if (failed > 0) {
            toast.error(`${failed} of ${results.length} item(s) failed.`)
          } else {
            toast.success(`${results.length} asset(s) updated.`)
          }
          setSelected(new Map())
        },
        onError: () => toast.error('Batch action failed.'),
      }
    )
  }

  function handleBatchDelete() {
    batchAction.mutate(
      { items: selectedItems, action: 'delete' },
      {
        onSuccess: (results) => {
          const failed = results.filter((r) => !r.success).length
          if (failed > 0) {
            toast.error(`${failed} of ${results.length} item(s) failed to delete.`)
          } else {
            toast.success(`${results.length} asset(s) deleted.`)
          }
          setSelected(new Map())
          setBatchDeleteOpen(false)
        },
        onError: () => toast.error('Batch delete failed.'),
      }
    )
  }

  async function handleBatchDownload() {
    for (const item of selectedItems) {
      try {
        const detail = await assetsApi.getAsset(item.assetType, item.sourceId)
        await downloadAsset(detail)
      } catch {
        toast.error('Failed to download one or more assets.')
      }
    }
  }

  async function handleBatchExport() {
    try {
      const details = await Promise.all(
        selectedItems.map((item) => assetsApi.getAsset(item.assetType, item.sourceId))
      )
      downloadBlob('assets-export.json', exportAssetsAsJson(details), 'application/json')
      toast.success('Export downloaded.')
    } catch {
      toast.error('Failed to export selected assets.')
    }
  }

  return (
    <Card data-presentation-target='content-studio.workspace.assets.library'>
      <CardContent className='space-y-4 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <AssetToolbar
            filters={filters}
            onFiltersChange={setFilters}
            providerOptions={providerOptions}
          />

          <Button size='sm' onClick={() => setNewPromptOpen(true)}>
            <Plus className='mr-2 h-4 w-4' /> New Prompt Template
          </Button>
        </div>

        {assets.isLoading && (
          <div
            role='status'
            aria-label='Loading assets'
            className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className='h-64 w-full' />
            ))}
          </div>
        )}

        {assets.isError && (
          <p className='text-sm text-destructive'>
            Failed to load assets. Try refreshing the page.
          </p>
        )}

        {!assets.isLoading && !assets.isError && assets.data?.items.length === 0 && (
          <div className='flex flex-col items-center justify-center gap-2 py-12 text-center'>
            <LibraryBig className='h-8 w-8 text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>
              No assets yet. Generate content or images, or add a prompt template,
              to see them here.
            </p>
          </div>
        )}

        {!assets.isLoading && !assets.isError && assets.data && assets.data.items.length > 0 && (
          <>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {assets.data.items.map((item) => (
                <AssetCard
                  key={`${item.assetType}:${item.id}`}
                  asset={item}
                  projectId={projectId}
                  selected={selected.has(assetKey({ assetType: item.assetType, sourceId: item.id }))}
                  onSelectChange={(checked) => toggleSelect(item, checked)}
                  onView={setViewingAsset}
                />
              ))}
            </div>

            <AssetPagination
              page={assets.data.pagination.page}
              pageSize={assets.data.pagination.pageSize}
              total={assets.data.pagination.total}
              totalPages={assets.data.pagination.totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>

      <AssetBulkActionsBar
        selectedCount={selectedItems.length}
        entityName='asset'
        onClear={() => setSelected(new Map())}
      >
        <Button size='sm' variant='ghost' onClick={() => runBatchAction('approve')}>
          Approve
        </Button>
        <Button size='sm' variant='ghost' onClick={() => runBatchAction('reject')}>
          Reject
        </Button>
        <Button size='sm' variant='ghost' onClick={handleBatchDownload}>
          Download
        </Button>
        <Button size='sm' variant='ghost' onClick={handleBatchExport}>
          Export
        </Button>
        <Button
          size='sm'
          variant='ghost'
          className='text-destructive'
          onClick={() => setBatchDeleteOpen(true)}
        >
          Delete
        </Button>
      </AssetBulkActionsBar>

      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title='Delete selected assets?'
        desc={`This will permanently delete ${selectedItems.length} asset(s). This can't be undone.`}
        destructive
        confirmText='Delete'
        isLoading={batchAction.isPending}
        handleConfirm={handleBatchDelete}
      />

      <AssetDetailSheet
        asset={viewingAsset}
        projectId={projectId}
        onOpenChange={(open) => {
          if (!open) setViewingAsset(null)
        }}
      />

      <NewPromptTemplateDialog
        projectId={projectId}
        open={newPromptOpen}
        onOpenChange={setNewPromptOpen}
      />
    </Card>
  )
}
