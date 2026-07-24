import { Cross2Icon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ASSET_TYPE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  type AssetType,
  type ReviewStatus,
} from '../../types/asset'

const ALL = '__all__'

export interface AssetFilters {
  search: string
  type?: AssetType
  status?: ReviewStatus
  provider?: string
}

interface AssetToolbarProps {
  filters: AssetFilters
  onFiltersChange: (filters: AssetFilters) => void
  providerOptions: string[]
}

// Visually matches components/data-table/toolbar.tsx (same height, spacing,
// and Reset affordance) but is driven by plain filter-object props instead
// of a @tanstack/react-table instance — the Asset Library's filters are
// server-side query params (GET /assets?type=&status=&provider=&search=),
// each single-valued, not client-side column filters over already-loaded
// rows, so a Select per field is both simpler and a more honest fit than
// reusing the react-table-bound faceted filter/toolbar kit.
export function AssetToolbar({
  filters,
  onFiltersChange,
  providerOptions,
}: AssetToolbarProps) {
  const isFiltered = Boolean(filters.search || filters.type || filters.status || filters.provider)

  return (
    <div className='flex flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:gap-x-2'>
      <Input
        placeholder='Search title, prompt, provider, model, project...'
        aria-label='Search assets'
        value={filters.search}
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        className='h-8 w-full sm:w-64'
      />

      <Select
        value={filters.type ?? ALL}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            type: value === ALL ? undefined : (value as AssetType),
          })
        }
      >
        <SelectTrigger className='h-8 w-full sm:w-40' aria-label='Filter by type'>
          <SelectValue placeholder='Type' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {ASSET_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status ?? ALL}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            status: value === ALL ? undefined : (value as ReviewStatus),
          })
        }
      >
        <SelectTrigger className='h-8 w-full sm:w-40' aria-label='Filter by status'>
          <SelectValue placeholder='Status' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {REVIEW_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {providerOptions.length > 0 && (
        <Select
          value={filters.provider ?? ALL}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              provider: value === ALL ? undefined : value,
            })
          }
        >
          <SelectTrigger className='h-8 w-full sm:w-40' aria-label='Filter by provider'>
            <SelectValue placeholder='Provider' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All providers</SelectItem>
            {providerOptions.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {provider}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isFiltered && (
        <Button
          variant='ghost'
          onClick={() => onFiltersChange({ search: '' })}
          className='h-8 px-2 lg:px-3'
        >
          Reset
          <Cross2Icon className='ms-2 h-4 w-4' />
        </Button>
      )}
    </div>
  )
}
