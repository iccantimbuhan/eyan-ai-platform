import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface AssetBulkActionsBarProps {
  selectedCount: number
  entityName: string
  onClear: () => void
  children: React.ReactNode
}

// A lightweight, plain-props sibling of
// components/data-table/bulk-actions.tsx (same floating bottom-center
// toolbar look) rather than a reuse of it — that component reads its
// selection from a @tanstack/react-table Table instance
// (getFilteredSelectedRowModel()), and the Asset Library's selection is
// plain component state over server-paginated data, not table rows.
export function AssetBulkActionsBar({
  selectedCount,
  entityName,
  onClear,
  children,
}: AssetBulkActionsBarProps) {
  useEffect(() => {
    if (selectedCount === 0) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClear()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCount, onClear])

  if (selectedCount === 0) {
    return null
  }

  return (
    <div
      role='toolbar'
      aria-label={`Bulk actions for ${selectedCount} selected ${entityName}${selectedCount > 1 ? 's' : ''}`}
      className='fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl'
    >
      <div className='flex items-center gap-x-2 rounded-xl border bg-background/95 p-2 shadow-xl backdrop-blur-lg supports-backdrop-filter:bg-background/60'>
        <Button
          variant='outline'
          size='icon'
          onClick={onClear}
          className='size-6 rounded-full'
          aria-label='Clear selection'
          title='Clear selection (Escape)'
        >
          <X />
        </Button>

        <Separator orientation='vertical' className='h-5' />

        <div className='flex items-center gap-x-1 text-sm'>
          <Badge variant='default' className='min-w-8 rounded-lg'>
            {selectedCount}
          </Badge>{' '}
          <span className='hidden sm:inline'>
            {entityName}
            {selectedCount > 1 ? 's' : ''}
          </span>{' '}
          selected
        </div>

        <Separator orientation='vertical' className='h-5' />

        {children}
      </div>
    </div>
  )
}
