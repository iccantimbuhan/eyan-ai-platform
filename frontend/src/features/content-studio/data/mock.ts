import type { ContentProject } from '../types/project'

export const quickActions = [
  {
    title: 'Blog',
    description: 'Generate AI blog posts',
    icon: '📝',
  },
  {
    title: 'Social',
    description: 'Create social content',
    icon: '📢',
  },
  {
    title: 'Script',
    description: 'Write video scripts',
    icon: '🎬',
  },
  {
    title: 'Thumbnail',
    description: 'Generate thumbnails',
    icon: '🖼️',
  },
]

export const projects: ContentProject[] = [
  {
    id: '1',
    title: 'Website Redesign',
    type: 'Blog Campaign',
    status: 'Draft',
    updatedAt: '2 hours ago',
  },
  {
    id: '2',
    title: 'Summer Sale Ads',
    type: 'Social Campaign',
    status: 'In Progress',
    updatedAt: 'Yesterday',
  },
  {
    id: '3',
    title: 'AI Course Launch',
    type: 'Video Project',
    status: 'Published',
    updatedAt: '3 days ago',
  },
]

export const pipeline = [
  {
    stage: 'Ideas',
    total: 8,
  },
  {
    stage: 'Writing',
    total: 5,
  },
  {
    stage: 'Review',
    total: 2,
  },
  {
    stage: 'Published',
    total: 11,
  },
]
