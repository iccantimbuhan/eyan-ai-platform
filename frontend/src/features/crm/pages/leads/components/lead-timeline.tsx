import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowRightLeft, Bot, MessageSquare, UserCog, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useAddLeadNote } from '../../../hooks/use-leads'
import type { LeadActivity, LeadActivityType } from '../../../types/crm'

const ACTIVITY_ICON: Record<LeadActivityType, typeof MessageSquare> = {
  NOTE: MessageSquare,
  STATUS_CHANGE: ArrowRightLeft,
  ASSIGNMENT: UserCog,
  AI_ANALYSIS: Bot,
  AUTOMATION: Workflow,
}

type LeadTimelineProps = {
  leadId: string
  activities: LeadActivity[]
}

// Serves as both "Activity History" and "Automation History" (TDD §9) — one
// chronological list, distinguished by icon/type rather than two separate
// tabs backed by two separate queries.
export function LeadTimeline({ leadId, activities }: LeadTimelineProps) {
  const [note, setNote] = useState('')
  const addNote = useAddLeadNote(leadId)

  async function handleAddNote() {
    if (!note.trim()) return

    await addNote.mutateAsync(note.trim())
    setNote('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='space-y-2'>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder='Add a note...'
            rows={2}
          />
          <div className='flex justify-end'>
            <Button
              type='button'
              size='sm'
              disabled={!note.trim() || addNote.isPending}
              onClick={handleAddNote}
            >
              {addNote.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>

        {activities.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No activity yet. Notes, status changes, and (from Sprint 2 onward) automation runs
            will show up here.
          </p>
        ) : (
          <div className='space-y-4'>
            {activities.map((activity) => {
              const Icon = ACTIVITY_ICON[activity.type]

              return (
                <div key={activity.id} className='flex gap-3'>
                  <div className='mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted'>
                    <Icon className='h-3.5 w-3.5 text-muted-foreground' />
                  </div>
                  <div className='flex-1 space-y-0.5'>
                    <p className='text-sm'>{activity.body || activity.type}</p>
                    <p className='text-xs text-muted-foreground'>
                      {format(new Date(activity.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
