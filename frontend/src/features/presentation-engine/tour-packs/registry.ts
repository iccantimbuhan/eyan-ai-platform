import { aiChatScenes } from '../scenes/ai-chat.scenes'
import { dashboardScenes } from '../scenes/dashboard.scenes'
import type { SceneDefinition } from '../types/scene'
import type { TourPack } from '../types/tour-pack'
import { platformOverviewTour } from './platform-overview-tour'

const ALL_SCENES: SceneDefinition[] = [...dashboardScenes, ...aiChatScenes]
const sceneById = new Map(ALL_SCENES.map((scene) => [scene.id, scene]))

/** Adding a future module's Tour Pack means adding a file here — never touching the engine. */
export const TOUR_PACKS: Record<string, TourPack> = {
  [platformOverviewTour.id]: platformOverviewTour,
}

export function resolveTourPackScenes(tourPack: TourPack): SceneDefinition[] {
  return tourPack.scenes
    .map((ref) => {
      const base = sceneById.get(ref.sceneId)
      if (!base) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(
            `[presentation-engine] Tour pack "${tourPack.id}" references unknown scene "${ref.sceneId}"`
          )
        }
        return null
      }
      return ref.overrides ? { ...base, ...ref.overrides } : base
    })
    .filter((scene): scene is SceneDefinition => scene !== null)
}
