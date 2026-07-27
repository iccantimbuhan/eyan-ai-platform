import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useBrandKits } from '../../hooks/use-brand-kits'

const NONE_VALUE = '__none__'

interface BrandKitSelectProps {
  projectId: string
  value: string | undefined
  onValueChange: (brandKitId: string | undefined) => void
  id?: string
}

// A plain brand-kit picker built on the existing useBrandKits(projectId)
// hook (Sprint 6.1) — reusable wherever a generation form needs an
// optional brandKitId, starting with Video Studio. Content/Image
// generation forms don't use this yet even though their backend endpoints
// already accept brandKitId; retrofitting them is a named follow-up, not
// done here.
export function BrandKitSelect({
  projectId,
  value,
  onValueChange,
  id = 'brand-kit',
}: BrandKitSelectProps) {
  const { data: brandKits } = useBrandKits(projectId)

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(next) =>
        onValueChange(next === NONE_VALUE ? undefined : next)
      }
    >
      <SelectTrigger id={id} className='w-full sm:w-64'>
        <SelectValue placeholder='None' />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value={NONE_VALUE}>None</SelectItem>

        {brandKits?.map((brandKit) => (
          <SelectItem key={brandKit.id} value={brandKit.id}>
            {brandKit.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
