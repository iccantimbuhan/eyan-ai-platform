import { describe, expect, it } from 'vitest'
import { substituteVariables } from '../../core/prompt/variables.js'

describe('substituteVariables', () => {
  it('substitutes known string variables', () => {
    expect(substituteVariables('Hello {{name}}', { name: 'World' })).toBe('Hello World')
  })

  it('leaves unknown placeholders unchanged', () => {
    expect(substituteVariables('{{known}} and {{unknown}}', { known: 'yes' })).toBe(
      'yes and {{unknown}}'
    )
  })

  it('substitutes numbers and booleans, including falsy ones', () => {
    expect(substituteVariables('count={{count}} flag={{flag}}', { count: 0, flag: false })).toBe(
      'count=0 flag=false'
    )
  })

  it('tolerates whitespace inside braces', () => {
    expect(substituteVariables('{{ name }}', { name: 'ok' })).toBe('ok')
  })

  it('replaces every occurrence of a repeated placeholder', () => {
    expect(substituteVariables('{{x}} {{x}}', { x: 'y' })).toBe('y y')
  })

  it('does not re-scan a replacement value that contains placeholder syntax', () => {
    expect(substituteVariables('{{a}}', { a: '{{b}}' })).toBe('{{b}}')
  })

  it('preserves code fences and surrounding text untouched', () => {
    const template = '```ts\nconst x = {{value}}\n```'
    expect(substituteVariables(template, { value: 1 })).toBe('```ts\nconst x = 1\n```')
  })
})
