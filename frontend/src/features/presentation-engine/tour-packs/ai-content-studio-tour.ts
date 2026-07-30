import type { TourPack } from '../types/tour-pack'

/** Phase 2's real deliverable: the first full narrated presentation of a single, deep feature area. */
export const aiContentStudioTour: TourPack = {
  id: 'ai-content-studio',
  title: 'AI Content Studio',
  audience: 'feature',
  description: 'A guided tour of project management, the production pipeline, and the prompt library.',
  defaultNarrationProviderId: 'pre-recorded',
  scenes: [
    { sceneId: 'content-studio.overview' },
    { sceneId: 'content-studio.new-project' },
    { sceneId: 'content-studio.pipeline' },
    { sceneId: 'content-studio.dashboard-stats' },
    { sceneId: 'content-studio.dashboard-activity' },
    { sceneId: 'content-studio.prompt-library' },
  ],
  metadata: {
    tags: ['content-studio'],
  },
}
