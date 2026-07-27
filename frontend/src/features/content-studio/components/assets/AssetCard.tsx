import { useState } from 'react'
import {
  Copy,
  Download,
  Eye,
  FileText,
  ImageIcon,
  MoreHorizontal,
  NotebookText,
  Palette,
  RefreshCw,
  Trash2,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { assetsApi } from '../../api/assets.api'
import { resolveImageUrl } from '../../api/images.api'
import { downloadAsset } from '../../lib/asset-export'
import { useDeleteAsset } from '../../hooks/use-delete-asset'
import { useDuplicateAsset } from '../../hooks/use-duplicate-asset'
import { useRegenerateAsset } from '../../hooks/use-regenerate-asset'
import { ASSET_TYPE_OPTIONS, supportsRegeneration, type AssetSummary } from '../../types/asset'
import { AssetStatusBadge } from './AssetStatusBadge'

interface AssetCardProps {
  asset: AssetSummary
  projectId: string
  selected?: boolean
  onSelectChange?: (selected: boolean) => void
  onView: (asset: AssetSummary) => void
}

function assetTypeLabel(assetType: AssetSummary['assetType']): string {
  return (
    ASSET_TYPE_OPTIONS.find((option) => option.value === assetType)?.label ??
    assetType
  )
}

function AssetTypeIcon({ assetType }: { assetType: AssetSummary['assetType'] }) {
  if (assetType === 'IMAGE') return <ImageIcon className='h-6 w-6 text-primary' />
  if (assetType === 'PROMPT_TEMPLATE')
    return <NotebookText className='h-6 w-6 text-primary' />
  if (assetType === 'BRAND_KIT') return <Palette className='h-6 w-6 text-primary' />
  if (assetType === 'VIDEO') return <Video className='h-6 w-6 text-primary' />
  return <FileText className='h-6 w-6 text-primary' />
}

export function AssetCard({
  asset,
  projectId,
  selected = false,
  onSelectChange,
  onView,
}: AssetCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  const duplicateAsset = useDuplicateAsset(projectId)
  const regenerateAsset = useRegenerateAsset(projectId)
  const deleteAsset = useDeleteAsset(projectId)

  const handleCopy = async () => {
    try {
      const detail = await assetsApi.getAsset(asset.assetType, asset.id)
      await navigator.clipboard.writeText(detail.output ?? detail.prompt)
      toast.success('Copied to clipboard.')
    } catch {
      toast.error('Failed to copy asset content.')
    }
  }

  const handleDownload = async () => {
    try {
      const detail = await assetsApi.getAsset(asset.assetType, asset.id)
      await downloadAsset(detail)
    } catch {
      toast.error('Failed to download asset.')
    }
  }

  const handleDuplicate = () => {
    duplicateAsset.mutate(
      { assetType: asset.assetType, sourceId: asset.id },
      {
        onSuccess: () => toast.success('Asset duplicated.'),
        onError: () => toast.error('Failed to duplicate asset.'),
      }
    )
  }

  const handleRegenerate = () => {
    regenerateAsset.mutate(
      { assetType: asset.assetType, sourceId: asset.id },
      {
        onSuccess: () => toast.success('Asset regenerated.'),
        onError: () => toast.error('Failed to regenerate asset.'),
      }
    )
  }

  return (
    <>
      <Card className='relative transition-shadow hover:shadow-md'>
        {onSelectChange && (
          <Checkbox
            className='absolute top-3 left-3 z-10 bg-background'
            checked={selected}
            onCheckedChange={(checked) => onSelectChange(Boolean(checked))}
            aria-label={`Select ${asset.title}`}
          />
        )}

        <CardContent className='space-y-3 p-4'>
          <button
            type='button'
            className='block w-full text-left'
            onClick={() => onView(asset)}
          >
            {asset.thumbnailUrl ? (
              <img
                src={resolveImageUrl(asset.thumbnailUrl)}
                alt={asset.title}
                className='aspect-video w-full rounded-md border object-cover'
              />
            ) : (
              <div className='flex aspect-video w-full items-center justify-center rounded-md border bg-muted'>
                <AssetTypeIcon assetType={asset.assetType} />
              </div>
            )}
          </button>

          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline'>{assetTypeLabel(asset.assetType)}</Badge>
            <AssetStatusBadge status={asset.status} />
          </div>

          <div>
            <button
              type='button'
              className='text-left text-sm font-semibold hover:underline'
              onClick={() => onView(asset)}
            >
              {asset.title}
            </button>

            <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
              {asset.promptPreview}
            </p>
          </div>

          <div className='flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground'>
            <span>
              {asset.provider ?? '—'}
              {asset.model ? ` · ${asset.model}` : ''}
            </span>
            <span>v{asset.version}</span>
          </div>

          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground'>
              {new Date(asset.createdAt).toLocaleDateString()}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' aria-label='Asset actions'>
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={() => onView(asset)}>
                  <Eye className='mr-2 h-4 w-4' /> View
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className='mr-2 h-4 w-4' /> Copy
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleDownload}>
                  <Download className='mr-2 h-4 w-4' /> Download
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className='mr-2 h-4 w-4' /> Duplicate
                </DropdownMenuItem>

                {supportsRegeneration(asset.assetType) && (
                  <DropdownMenuItem
                    onClick={handleRegenerate}
                    disabled={regenerateAsset.isPending}
                  >
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {regenerateAsset.isPending ? 'Regenerating...' : 'Regenerate'}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className='text-destructive'
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className='mr-2 h-4 w-4' /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Delete this asset?'
        desc={`This will permanently delete "${asset.title}". This can't be undone.`}
        destructive
        confirmText='Delete'
        isLoading={deleteAsset.isPending}
        handleConfirm={() => {
          deleteAsset.mutate(
            { assetType: asset.assetType, sourceId: asset.id },
            {
              onSuccess: () => {
                setDeleteOpen(false)
                toast.success('Asset deleted.')
              },
              onError: () => toast.error('Failed to delete asset.'),
            }
          )
        }}
      />
    </>
  )
}
