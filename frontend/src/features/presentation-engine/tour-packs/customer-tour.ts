import type { TourPack } from '../types/tour-pack'

/** A product-value-framed curation — daily-usage flows, not backend/dashboard internals. */
export const customerTour: TourPack = {
  id: 'customer-tour',
  title: 'Customer Tour',
  audience: 'customer',
  description: 'A product-focused tour of AI Chat and AI Content Studio — what you use every day.',
  defaultNarrationProviderId: 'pre-recorded',
  scenes: [
    { sceneId: 'ai-chat.overview' },
    { sceneId: 'ai-chat.compose' },
    { sceneId: 'content-studio.overview' },
    { sceneId: 'content-studio.new-project' },
    { sceneId: 'content-studio.prompt-library' },
  ],
  metadata: {
    tags: ['customer'],
  },
}
