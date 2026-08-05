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

export interface PromptStatsSummary {
  templateTitle: string
  contextTitles: string[]
  modifierTitles: string[]
}

export interface ContextStats {
  fileCount: number
  categories: ContextCategory[]
}

export interface PromptMetrics {
  characterCount: number
  wordCount: number
  estimatedTokenCount: number
}

export type PromptComplexity = 'Low' | 'Medium' | 'High'

export interface OptimizationStats {
  duplicateContextsAvoided: number
  possiblyUnnecessaryContextIds: string[]
  complexity: PromptComplexity
  estimatedTokenSavings: number
}

export interface PromptStats {
  prompt: PromptStatsSummary
  context: ContextStats
  metrics: PromptMetrics
  optimization: OptimizationStats
}
