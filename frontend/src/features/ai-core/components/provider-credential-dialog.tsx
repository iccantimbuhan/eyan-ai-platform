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
import { useAddProviderCredential } from '../hooks/use-providers'

type Props = { providerId: string | null; onOpenChange: (open: boolean) => void }

// A raw JSON textarea for the credential payload (e.g. {"apiKey": "sk-..."})
// — deliberately minimal for Phase 1 rather than a per-provider-shaped
// form; CredentialManagerService.encrypt() accepts any non-empty object, so
// this is a real, working path, not a placeholder.
export function ProviderCredentialDialog({ providerId, onOpenChange }: Props) {
  const [label, setLabel] = useState('')
  const [credentialsText, setCredentialsText] = useState('{\n  "apiKey": ""\n}')
  const [parseError, setParseError] = useState<string | null>(null)
  const addCredential = useAddProviderCredential()

  async function submit() {
    if (!providerId) return
    try {
      const credentials = JSON.parse(credentialsText)
      setParseError(null)
      await addCredential.mutateAsync({ providerId, label, credentials })
      setLabel('')
      onOpenChange(false)
    } catch {
      setParseError('Credentials must be valid JSON.')
    }
  }

  return (
    <Dialog open={providerId !== null} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Add Credential</DialogTitle>
          <DialogDescription>Encrypted at rest via CredentialManagerService — never returned by any API response.</DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>Label</Label>
            <Input placeholder='e.g. Production key' value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label>Credentials (JSON)</Label>
            <Textarea
              rows={4}
              className='font-mono text-sm'
              value={credentialsText}
              onChange={(event) => setCredentialsText(event.target.value)}
            />
            {parseError && <p className='text-sm text-destructive'>{parseError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={addCredential.isPending}>
            Cancel
          </Button>
          <Button type='button' onClick={submit} disabled={addCredential.isPending || !label}>
            {addCredential.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
