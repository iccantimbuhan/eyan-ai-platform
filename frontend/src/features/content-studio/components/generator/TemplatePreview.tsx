import { FileText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { CONTENT_TYPE_OPTIONS } from '../../types/content'
import type { PromptTemplate } from '../../types/prompt-template'

interface TemplatePreviewProps {
  template: PromptTemplate | null
}

const VARIABLE_SPLIT_PATTERN = /(\{\{\s*\w+\s*\}\})/g
const VARIABLE_TOKEN_PATTERN = /^\{\{\s*\w+\s*\}\}$/

function renderPromptBody(promptBody: string) {
  return promptBody.split(VARIABLE_SPLIT_PATTERN).map((part, index) =>
    VARIABLE_TOKEN_PATTERN.test(part) ? (
      <Badge key={index} variant='secondary' className='mx-0.5'>
        {part}
      </Badge>
    ) : (
      <span key={index}>{part}</span>
    )
  )
}

function contentTypeLabel(contentType: PromptTemplate['contentType']) {
  return (
    CONTENT_TYPE_OPTIONS.find((option) => option.value === contentType)
      ?.label ?? contentType
  )
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  if (!template) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center gap-2 py-12 text-center'>
          <FileText className='h-8 w-8 text-muted-foreground' />

          <p className='text-sm text-muted-foreground'>
            Select a template to preview it here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <CardTitle className='break-words'>{template.name}</CardTitle>
          <Badge variant='outline' className='shrink-0'>
            {template.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-3'>
        {template.isCustom ? (
          <p className='text-sm text-muted-foreground'>
            Write your own prompt from scratch. No template will be applied.
          </p>
        ) : (
          <>
            <p className='text-xs text-muted-foreground'>
              Generates: {contentTypeLabel(template.contentType)}
            </p>

            <p className='text-sm leading-relaxed'>
              {renderPromptBody(template.promptBody)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
