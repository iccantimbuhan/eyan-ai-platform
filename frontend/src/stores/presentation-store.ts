import { create } from 'zustand'
import type { SceneDefinition } from '@/features/presentation-engine/types/scene'

export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'error'

export type PlaybackSpeed = 1 | 1.25 | 1.5 | 2

interface PresentationState {
  activeTourPackId: string | null
  scenes: SceneDefinition[]
  currentSceneIndex: number
  playbackStatus: PlaybackStatus
  speed: PlaybackSpeed
  elapsedMsInScene: number
  error: string | null

  /** data-presentation-target keys currently spotlighted. */
  activeTargets: string[]
  activeCalloutText: string | null
  activeSubtitleText: string | null
  captionsEnabled: boolean
  isAwaitingUserInteraction: boolean
  interactionPrompt: string | null

  /** Bumped on every resolveInteraction() call so the runner's pending await can react to it. */
  interactionResolutionToken: number

  start: (tourPackId: string, scenes: SceneDefinition[]) => void
  stop: () => void
  play: () => void
  pause: () => void
  restart: () => void
  next: () => void
  prev: () => void
  seekToScene: (index: number) => void
  setSpeed: (speed: PlaybackSpeed) => void
  toggleCaptions: () => void
  setElapsedMsInScene: (ms: number) => void
  setActiveTargets: (targets: string[]) => void
  setActiveCallout: (text: string | null) => void
  setActiveSubtitle: (text: string | null) => void
  setAwaitingInteraction: (awaiting: boolean, prompt?: string | null) => void
  resolveInteraction: () => void
  setError: (message: string | null) => void
  setPlaybackStatus: (status: PlaybackStatus) => void
}

const initialState = {
  activeTourPackId: null as string | null,
  scenes: [] as SceneDefinition[],
  currentSceneIndex: 0,
  playbackStatus: 'idle' as PlaybackStatus,
  speed: 1 as PlaybackSpeed,
  elapsedMsInScene: 0,
  error: null as string | null,
  activeTargets: [] as string[],
  activeCalloutText: null as string | null,
  activeSubtitleText: null as string | null,
  captionsEnabled: true,
  isAwaitingUserInteraction: false,
  interactionPrompt: null as string | null,
  interactionResolutionToken: 0,
}

export const usePresentationStore = create<PresentationState>()((set, get) => ({
  ...initialState,

  start: (tourPackId, scenes) =>
    set({
      ...initialState,
      captionsEnabled: get().captionsEnabled,
      activeTourPackId: tourPackId,
      scenes,
      currentSceneIndex: 0,
      playbackStatus: 'loading',
    }),

  stop: () => set({ ...initialState, captionsEnabled: get().captionsEnabled }),

  play: () =>
    set((state) =>
      state.playbackStatus === 'paused' || state.playbackStatus === 'loading'
        ? { playbackStatus: 'playing' }
        : {}
    ),

  pause: () =>
    set((state) => (state.playbackStatus === 'playing' ? { playbackStatus: 'paused' } : {})),

  restart: () =>
    set({
      currentSceneIndex: 0,
      elapsedMsInScene: 0,
      playbackStatus: 'loading',
      activeTargets: [],
      activeCalloutText: null,
      activeSubtitleText: null,
      isAwaitingUserInteraction: false,
    }),

  next: () =>
    set((state) => {
      const nextIndex = state.currentSceneIndex + 1
      if (nextIndex >= state.scenes.length) {
        return { playbackStatus: 'completed', activeTargets: [], activeCalloutText: null }
      }
      return {
        currentSceneIndex: nextIndex,
        elapsedMsInScene: 0,
        playbackStatus: 'loading',
        activeTargets: [],
        activeCalloutText: null,
        activeSubtitleText: null,
        isAwaitingUserInteraction: false,
      }
    }),

  prev: () =>
    set((state) => {
      const prevIndex = Math.max(0, state.currentSceneIndex - 1)
      return {
        currentSceneIndex: prevIndex,
        elapsedMsInScene: 0,
        playbackStatus: 'loading',
        activeTargets: [],
        activeCalloutText: null,
        activeSubtitleText: null,
        isAwaitingUserInteraction: false,
      }
    }),

  seekToScene: (index) =>
    set((state) => ({
      currentSceneIndex: Math.min(Math.max(0, index), Math.max(0, state.scenes.length - 1)),
      elapsedMsInScene: 0,
      playbackStatus: 'loading',
      activeTargets: [],
      activeCalloutText: null,
      activeSubtitleText: null,
      isAwaitingUserInteraction: false,
    })),

  setSpeed: (speed) => set({ speed }),

  toggleCaptions: () => set((state) => ({ captionsEnabled: !state.captionsEnabled })),

  setElapsedMsInScene: (ms) => set({ elapsedMsInScene: ms }),

  setActiveTargets: (targets) => set({ activeTargets: targets }),

  setActiveCallout: (text) => set({ activeCalloutText: text }),

  setActiveSubtitle: (text) => set({ activeSubtitleText: text }),

  setAwaitingInteraction: (awaiting, prompt = null) =>
    set({ isAwaitingUserInteraction: awaiting, interactionPrompt: awaiting ? prompt : null }),

  resolveInteraction: () =>
    set((state) => ({
      isAwaitingUserInteraction: false,
      interactionPrompt: null,
      interactionResolutionToken: state.interactionResolutionToken + 1,
    })),

  setError: (message) => set({ error: message, playbackStatus: message ? 'error' : get().playbackStatus }),

  setPlaybackStatus: (status) => set({ playbackStatus: status }),
}))
