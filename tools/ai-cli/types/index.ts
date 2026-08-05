export interface CheckResult {
  label: string
  ok: boolean
  detail?: string
}

export type PromptCategory = 'session' | 'task' | 'modifier'

export type PromptVariables = Record<string, string | number | boolean>

export interface PromptTemplate {
  id: string
  title: string
  category: PromptCategory
  path: string
}

export interface RenderPromptOptions {
  template: PromptTemplate
  modifiers?: PromptTemplate[]
  variables?: PromptVariables
}

export type ContextCategory = 'domain' | 'standard' | 'reference' | 'operations'

export interface ContextMetadata {
  id: string
  title: string
  path: string
  category: ContextCategory
  description: string
}

export interface PromptRequest {
  templateId: string
  contextIds?: string[]
  modifierIds?: string[]
  variables?: PromptVariables
}
