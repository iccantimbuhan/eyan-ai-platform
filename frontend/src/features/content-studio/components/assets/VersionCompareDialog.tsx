import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

import { resolveImageUrl } from '../../api/images.api'
import { useAsset } from '../../hooks/use-asset'
import type { AssetDetail, AssetType, AssetVersionSummary } from '../../types/asset'

interface VersionCompareDialogProps {
  assetType: AssetType
  versions: AssetVersionSummary[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Side-by-side comparison, not a line-level text diff — a deliberate scope
// choice for this sprint (the brief asks for "Compare", not a diff
// algorithm); each pane shows the full rendered output/image for the
// selected version, which is enough to visually spot what changed.
export function VersionCompareDialog({
  assetType,
  versions,
  open,
  onOpenChange,
}: VersionCompareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Compare Versions</DialogTitle>
        </DialogHeader>

        {/* Mounted fresh only while open, so its local leftId/rightId state
            initializes from the current versions list with no reset effect
            needed. */}
        {open && <VersionCompareBody assetType={assetType} versions={versions} />}
      </DialogContent>
    </Dialog>
  )
}

function VersionCompareBody({
  assetType,
  versions,
}: {
  assetType: AssetType
  versions: AssetVersionSummary[]
}) {
  const [leftId, setLeftId] = useState(versions[0]?.sourceId ?? '')
  const [rightId, setRightId] = useState(
    versions[versions.length - 1]?.sourceId ?? ''
  )

  const left = useAsset(assetType, leftId)
  const right = useAsset(assetType, rightId)

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
      <VersionPicker versions={versions} value={leftId} onChange={setLeftId} label='Version A' />
      <VersionPicker versions={versions} value={rightId} onChange={setRightId} label='Version B' />

      <VersionPane query={left} />
      <VersionPane query={right} />
    </div>
  )
}

function VersionPicker({
  versions,
  value,
  onChange,
  label,
}: {
  versions: AssetVersionSummary[]
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {versions.map((version) => (
          <SelectItem key={version.sourceId} value={version.sourceId}>
            v{version.versionNumber} · {new Date(version.createdAt).toLocaleDateString()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function VersionPane({
  query,
}: {
  query: { data?: AssetDetail; isLoading: boolean; isError: boolean }
}) {
  if (query.isLoading) {
    return <Skeleton className='h-48 w-full' />
  }

  if (query.isError || !query.data) {
    return (
      <p className='flex h-48 items-center justify-center text-sm text-destructive'>
        Failed to load this version.
      </p>
    )
  }

  const detail = query.data

  if (detail.assetType === 'IMAGE' && detail.thumbnailUrl) {
    return (
      <img
        src={resolveImageUrl(detail.thumbnailUrl)}
        alt={detail.title}
        className='w-full rounded-md border object-cover'
      />
    )
  }

  return (
    <p className='max-h-64 overflow-y-auto rounded-md border p-2 text-sm whitespace-pre-wrap'>
      {detail.output ?? detail.prompt}
    </p>
  )
}
