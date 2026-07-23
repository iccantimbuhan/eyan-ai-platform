import { useCallback, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import type { useGenerateContent } from '../../hooks/use-generate-content'
import { useRecentTemplates } from '../../hooks/use-recent-templates'
import { extractVariables, substituteVariables } from '../../lib/prompt-variables'
import { CONTENT_TYPE_OPTIONS, type ContentType } from '../../types/content'
import type { PromptTemplate } from '../../types/prompt-template'
import type { SavedPrompt } from '../../types/saved-prompt'
import { SavedPromptReuseList } from './SavedPromptReuseList'
import { TemplatePicker } from './TemplatePicker'
import { TemplatePreview } from './TemplatePreview'
import { VariableForm } from './VariableForm'

interface GenerateFormProps {
  projectId: string
  generateContent: ReturnType<typeof useGenerateContent>
}

export function GenerateForm({ projectId, generateContent }: GenerateFormProps) {
  const { lastTemplateId, recentTemplateIds, recordTemplateUse } =
    useRecentTemplates()

  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(
    null
  )
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [customPrompt, setCustomPrompt] = useState('')
  const [customType, setCustomType] = useState<ContentType>('BLOG')

  const isCustomMode = !selectedTemplate || selectedTemplate.isCustom

  const variables = useMemo(
    () =>
      selectedTemplate && !selectedTemplate.isCustom
        ? extractVariables(selectedTemplate.promptBody)
        : [],
    [selectedTemplate]
  )

  const handleSelectTemplate = useCallback(
    (template: PromptTemplate) => {
      if (selectedTemplate?.id !== template.id) {
        setVariableValues({})
      }
      setSelectedTemplate(template)
      recordTemplateUse(template)
    },
    [selectedTemplate, recordTemplateUse]
  )

  const handleVariableChange = (name: string, value: string) => {
    setVariableValues((previous) => ({ ...previous, [name]: value }))
  }

  const handleReuseSavedPrompt = (prompt: SavedPrompt) => {
    setCustomPrompt(prompt.promptBody)
    setCustomType(prompt.contentType)
  }

  const handleGenerate = () => {
    const payload =
      selectedTemplate && !selectedTemplate.isCustom
        ? {
            type: selectedTemplate.contentType,
            prompt: substituteVariables(
              selectedTemplate.promptBody,
              variableValues
            ).trim(),
          }
        : { type: customType, prompt: customPrompt.trim() }

    generateContent.mutate({ projectId, ...payload })
  }

  const canGenerate = isCustomMode
    ? customPrompt.trim().length > 0
    : variables.every((name) => (variableValues[name] ?? '').trim().length > 0)

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Choose a Starting Point</CardTitle>
        </CardHeader>

        <CardContent>
          <TemplatePicker
            selectedTemplateId={selectedTemplate?.id ?? null}
            recentTemplateIds={recentTemplateIds}
            lastTemplateId={lastTemplateId}
            onSelect={handleSelectTemplate}
          />
        </CardContent>
      </Card>

      <div className='grid gap-6 lg:grid-cols-2'>
        <TemplatePreview template={selectedTemplate} />

        <Card>
          <CardHeader>
            <CardTitle>Generate Content</CardTitle>
          </CardHeader>

          <CardContent className='space-y-4'>
            {isCustomMode ? (
              <>
                <SavedPromptReuseList onSelect={handleReuseSavedPrompt} />

                <div className='space-y-2'>
                  <Label htmlFor='content-type'>Content Type</Label>

                  <Select
                    value={customType}
                    onValueChange={(value) => setCustomType(value as ContentType)}
                  >
                    <SelectTrigger id='content-type' className='w-full sm:w-64'>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {CONTENT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='content-prompt'>Prompt</Label>

                  <Textarea
                    id='content-prompt'
                    placeholder='Describe the content you want to generate...'
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className='min-h-32'
                  />
                </div>
              </>
            ) : variables.length > 0 ? (
              <VariableForm
                variables={variables}
                values={variableValues}
                onChange={handleVariableChange}
              />
            ) : (
              <p className='text-sm text-muted-foreground'>
                This template has no fields to fill in — ready to generate.
              </p>
            )}

            {generateContent.isError && (
              <p className='text-sm text-destructive'>
                Failed to generate content. Please try again.
              </p>
            )}

            <Button
              className='w-full sm:w-auto'
              disabled={!canGenerate || generateContent.isPending}
              onClick={handleGenerate}
            >
              {generateContent.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
