import type { TourPack } from '../types/tour-pack'

/**
 * The public homepage's "Watch Presentation" CTA starts this pack. It's a
 * curated highlight reel over already-authored scenes — a platform-breadth
 * opener followed by a deeper look at the flagship feature — not new
 * presentation content of its own, per the Tour Pack reuse model.
 */
export const recruiterTour: TourPack = {
  id: 'recruiter-tour',
  title: 'Recruiter Tour',
  audience: 'recruiter',
  description: 'A quick, technical walkthrough of the platform and its AI Content Studio.',
  defaultNarrationProviderId: 'pre-recorded',
  scenes: [
    { sceneId: 'dashboard.welcome' },
    { sceneId: 'dashboard.platform-stats' },
    { sceneId: 'content-studio.overview' },
    { sceneId: 'content-studio.pipeline' },
    { sceneId: 'content-studio.dashboard-stats' },
    { sceneId: 'ai-chat.overview' },
  ],
  metadata: {
    tags: ['recruiter', 'homepage'],
  },
}
