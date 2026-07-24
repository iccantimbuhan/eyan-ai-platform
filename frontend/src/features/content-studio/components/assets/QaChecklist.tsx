import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  CHECKLIST_ITEMS,
  checklistCategoryForAssetType,
  type AssetType,
  type ChecklistItemValue,
  type ChecklistResult,
} from '../../types/asset'

interface QaChecklistProps {
  assetType: AssetType
  value: ChecklistItemValue[]
  onChange: (value: ChecklistItemValue[]) => void
}

// Reusable across the Asset Detail QA panel and (indirectly, via the same
// value shape) anywhere else a checklist needs reviewing — the category and
// its fixed item list are derived from assetType, never passed in, so every
// caller stays in sync with the one taxonomy defined in types/asset.ts.
export function QaChecklist({ assetType, value, onChange }: QaChecklistProps) {
  const category = checklistCategoryForAssetType(assetType)
  const items = CHECKLIST_ITEMS[category]

  function valueFor(item: string): ChecklistItemValue {
    return value.find((entry) => entry.item === item) ?? { category, item, result: null }
  }

  function update(item: string, patch: Partial<ChecklistItemValue>) {
    const next = { ...valueFor(item), ...patch }
    onChange([...value.filter((entry) => entry.item !== item), next])
  }

  function toggleResult(item: string, result: ChecklistResult) {
    const current = valueFor(item)
    update(item, { result: current.result === result ? null : result })
  }

  return (
    <div className='space-y-3'>
      {items.map((item) => {
        const itemValue = valueFor(item)

        return (
          <div key={item} className='space-y-2 rounded-md border p-3'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm font-medium'>{item}</span>

              <div className='flex gap-1'>
                <Button
                  type='button'
                  size='sm'
                  variant={itemValue.result === 'PASS' ? 'default' : 'outline'}
                  aria-pressed={itemValue.result === 'PASS'}
                  onClick={() => toggleResult(item, 'PASS')}
                >
                  Pass
                </Button>

                <Button
                  type='button'
                  size='sm'
                  variant={itemValue.result === 'FAIL' ? 'destructive' : 'outline'}
                  aria-pressed={itemValue.result === 'FAIL'}
                  onClick={() => toggleResult(item, 'FAIL')}
                >
                  Fail
                </Button>
              </div>
            </div>

            <Textarea
              placeholder='Comment (optional)'
              aria-label={`Comment for ${item}`}
              value={itemValue.comment ?? ''}
              onChange={(e) => update(item, { comment: e.target.value })}
              className='min-h-16 text-sm'
            />
          </div>
        )
      })}
    </div>
  )
}
