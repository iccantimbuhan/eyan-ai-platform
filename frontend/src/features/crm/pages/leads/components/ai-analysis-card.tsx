import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRerunLeadQualification, useUpdateLeadStatus } from '../../../hooks/use-leads'
import type { LeadAiAnalysis, LeadStatus } from '../../../types/crm'

type AiAnalysisCardProps = {
  leadId: string
  leadStatus: LeadStatus
  aiAnalyses: LeadAiAnalysis[]
}

// AI qualification runs via AI Core starting Sprint 5 — this card renders
// the empty state honestly rather than faking data, and picks up real
// content automatically once LeadAiAnalysis rows exist (no UI change
// needed then, the contract is already the Sprint 1 shape).
export function AiAnalysisCard({ leadId, leadStatus, aiAnalyses }: AiAnalysisCardProps) {
  const latest = aiAnalyses[0]
  const updateStatus = useUpdateLeadStatus(leadId)
  const rerun = useRerunLeadQualification(leadId)

  // Phase 4/7 (Sprint 5) — AI_ANALYZED *is* the Manual Review Queue bucket
  // (HIGH confidence auto-routes to QUALIFIED, LOW to DISQUALIFIED; only
  // MEDIUM/uncertain results land and stay here), so these actions only
  // make sense while the lead is still in it.
  const inReview = leadStatus === 'AI_ANALYZED'
  const busy = updateStatus.isPending || rerun.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Sparkles className='h-4 w-4' />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!latest ? (
          <p className='text-sm text-muted-foreground'>
            No AI analysis yet. Automated qualification runs once this lead is validated.
          </p>
        ) : (
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='secondary'>Score {latest.leadScore}</Badge>
              <Badge variant='outline'>Confidence {Math.round(latest.confidence * 100)}%</Badge>
              {latest.needsManualReview && <Badge variant='destructive'>Needs Review</Badge>}
            </div>
            <p className='text-sm'>{latest.summary}</p>
            <p className='text-sm text-muted-foreground'>{latest.recommendedAction}</p>

            {inReview && (
              <div className='flex flex-wrap gap-2 pt-1'>
                <Button
                  size='sm'
                  disabled={busy}
                  onClick={() => updateStatus.mutate({ status: 'QUALIFIED' })}
                >
                  Accept
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={busy}
                  onClick={() => updateStatus.mutate({ status: 'DISQUALIFIED' })}
                >
                  Reject
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={busy}
                  onClick={() => rerun.mutate()}
                >
                  {rerun.isPending ? 'Re-running...' : 'Re-run AI Qualification'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
