import type { TourPack } from '../types/tour-pack'

/**
 * Phase 1's real deliverable Tour Pack — spans Dashboard + AI Chat,
 * ahead of Phase 2's deeper Content Studio work. Purely data: no engine
 * changes were needed to add it beyond authoring the scenes above.
 */
export const platformOverviewTour: TourPack = {
  id: 'platform-overview',
  title: 'Platform Overview',
  audience: 'feature',
  description: 'A guided tour of the EYAN Studio dashboard and AI Chat.',
  defaultNarrationProviderId: 'pre-recorded',
  scenes: [
    { sceneId: 'dashboard.welcome' },
    { sceneId: 'dashboard.quick-actions' },
    { sceneId: 'dashboard.platform-stats' },
    { sceneId: 'ai-chat.overview' },
    { sceneId: 'ai-chat.compose' },
  ],
  metadata: {
    tags: ['overview'],
  },
}
