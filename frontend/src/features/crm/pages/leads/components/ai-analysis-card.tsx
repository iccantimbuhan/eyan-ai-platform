import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LeadAiAnalysis } from '../../../types/crm'

type AiAnalysisCardProps = {
  aiAnalyses: LeadAiAnalysis[]
}

// AI qualification runs in n8n starting Sprint 2/3 (TDD §10/§12) — this
// card renders the empty state honestly rather than faking data, and picks
// up real content automatically once LeadAiAnalysis rows exist (no UI
// change needed then, the contract is already the Sprint 1 shape).
export function AiAnalysisCard({ aiAnalyses }: AiAnalysisCardProps) {
  const latest = aiAnalyses[0]

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
            No AI analysis yet. Automated qualification arrives in a later sprint.
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
