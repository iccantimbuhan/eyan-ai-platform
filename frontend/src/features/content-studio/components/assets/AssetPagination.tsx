import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'

interface AssetPaginationProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
}

// A lightweight, plain-props sibling of components/data-table/pagination.tsx
// (same visual language) rather than a reuse of it — that component drives
// entirely off a @tanstack/react-table Table's client-side pagination
// state. The Asset Library paginates server-side (page/pageSize query
// params on GET /assets), so there's no Table instance to read from here.
export function AssetPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: AssetPaginationProps) {
  if (total === 0) {
    return null
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className='flex items-center justify-between px-2'>
      <p className='text-sm text-muted-foreground'>
        Showing {start}-{end} of {total}
      </p>

      <div className='flex items-center space-x-2'>
        <Button
          variant='outline'
          className='h-8 w-8 p-0'
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <span className='sr-only'>Previous page</span>
          <ChevronLeftIcon className='h-4 w-4' />
        </Button>

        <div className='text-sm font-medium'>
          Page {page} of {totalPages || 1}
        </div>

        <Button
          variant='outline'
          className='h-8 w-8 p-0'
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <span className='sr-only'>Next page</span>
          <ChevronRightIcon className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}
