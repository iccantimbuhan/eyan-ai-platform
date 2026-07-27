export type ContentType =
  | 'BLOG'
  | 'EMAIL'
  | 'SOCIAL_MEDIA'
  | 'MARKETING_COPY'
  | 'DOCUMENTATION'

export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'BLOG', label: 'Blog' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'MARKETING_COPY', label: 'Marketing Copy' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
]

export interface GeneratedContentItem {
  id: string
  projectId: string
  type: ContentType
  prompt: string
  output: string
  model: string
  createdAt: string
  updatedAt: string
}
