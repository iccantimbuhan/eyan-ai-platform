import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRunEvaluation } from '../hooks/use-evaluations'

type Props = { brainId: string; promptId: string | null; onOpenChange: (open: boolean) => void }

// Runs the given input against this exact prompt version via
// AiPlaygroundService (never the Brain's live active policy/prompt), then
// records one AiEvaluation row — see ai-evaluation.service.ts.
export function EvaluationRunDialog({ brainId, promptId, onOpenChange }: Props) {
  const run = useRunEvaluation(brainId, promptId ?? '')
  const [testCaseName, setTestCaseName] = useState('')
  const [inputText, setInputText] = useState('{\n  \n}')
  const [expectedShapeText, setExpectedShapeText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  function reset() {
    setTestCaseName('')
    setInputText('{\n  \n}')
    setExpectedShapeText('')
    setParseError(null)
  }

  async function submit() {
    if (!promptId) return
    try {
      const input = JSON.parse(inputText)
      const expectedShape = expectedShapeText.trim() ? JSON.parse(expectedShapeText) : undefined
      setParseError(null)
      await run.mutateAsync({ testCaseName, input, expectedShape })
      reset()
      onOpenChange(false)
    } catch {
      setParseError('Input and Expected Shape must be valid JSON.')
    }
  }

  return (
    <Dialog
      open={promptId !== null}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Run Evaluation</DialogTitle>
          <DialogDescription>Runs against this exact prompt version — never the Brain's live active policy.</DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>Test Case Name</Label>
            <Input
              placeholder='e.g. Missing company field'
              value={testCaseName}
              onChange={(event) => setTestCaseName(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label>Input (JSON)</Label>
            <Textarea
              rows={6}
              className='font-mono text-sm'
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label>Expected Shape (JSON, optional)</Label>
            <Textarea
              rows={4}
              className='font-mono text-sm'
              value={expectedShapeText}
              onChange={(event) => setExpectedShapeText(event.target.value)}
            />
          </div>
          {parseError && <p className='text-sm text-destructive'>{parseError}</p>}
        </div>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={run.isPending}>
            Cancel
          </Button>
          <Button type='button' onClick={submit} disabled={run.isPending || !testCaseName}>
            {run.isPending ? 'Running...' : 'Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
