import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface VariableFormProps {
  variables: string[]
  values: Record<string, string>
  onChange: (name: string, value: string) => void
}

export function VariableForm({ variables, values, onChange }: VariableFormProps) {
  if (variables.length === 0) {
    return null
  }

  return (
    <div className='space-y-4'>
      {variables.map((name) => (
        <div key={name} className='space-y-2'>
          <Label htmlFor={`variable-${name}`}>{name}</Label>

          <Input
            id={`variable-${name}`}
            value={values[name] ?? ''}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder={`Enter ${name}...`}
          />
        </div>
      ))}
    </div>
  )
}
