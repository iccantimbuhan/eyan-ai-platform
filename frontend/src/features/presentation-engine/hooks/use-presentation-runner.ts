import * as React from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { usePresentationStore } from '@/stores/presentation-store'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import type { AnimationDriver } from '../animation/driver'
import { createCssAnimationDriver } from '../animation/css-animation-driver'
import { panTo, resolveTargets } from '../engine/camera'
import { runCustomAction } from '../engine/custom-action-registry'
import { resolveRoute } from '../engine/resolve-route'
import { isSameRoute, targetSelector, waitForElement } from '../engine/scene-manager'
import { buildTimeline, computeSceneDurationMs, pausableDelay } from '../engine/timeline-engine'
import { getNarrationProvider } from '../narration/registry'
import type { NarrationHandle, NarrationProvider } from '../types/narration-provider'
import type { SceneDefinition, SceneInteractivePause, SubtitleCue } from '../types/scene'

const DEFAULT_INTERACTIVE_TIMEOUT_MS = 6000

/**
 * The Presentation Engine Core's orchestration hook — a generalized
 * `use-tour-runner.ts`: it watches which scene is active and drives the
 * Scene Manager -> Timeline Engine pipeline for it, entirely from data
 * (SceneDefinition), never from module-specific branching.
 */
export function usePresentationRunner() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const activeTourPackId = usePresentationStore((s) => s.activeTourPackId)
  const scenes = usePresentationStore((s) => s.scenes)
  const currentSceneIndex = usePresentationStore((s) => s.currentSceneIndex)

  const reducedMotion = useReducedMotion()
  const driverRef = React.useRef<AnimationDriver>(createCssAnimationDriver(reducedMotion))
  React.useEffect(() => {
    driverRef.current = createCssAnimationDriver(reducedMotion)
  }, [reducedMotion])

  const scene = scenes[currentSceneIndex]

  React.useEffect(() => {
    if (!activeTourPackId || !scene) return

    const controller = new AbortController()

    runScene({
      scene,
      navigate,
      pathname,
      driver: driverRef.current,
      signal: controller.signal,
    }).catch((err) => {
      if (controller.signal.aborted) return
      usePresentationStore
        .getState()
        .setError(err instanceof Error ? err.message : 'The presentation encountered an error.')
    })

    return () => controller.abort()
    // Deliberately re-run only when the active scene changes (or the tour
    // starts/stops) — navigate/pathname closing over stale-but-harmless
    // values for a single scene run is fine, matching use-tour-runner's
    // own effect-dependency shape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTourPackId, currentSceneIndex])
}

interface RunSceneArgs {
  scene: SceneDefinition
  navigate: ReturnType<typeof useNavigate>
  pathname: string
  driver: AnimationDriver
  signal: AbortSignal
}

async function runScene({ scene, navigate, pathname, driver, signal }: RunSceneArgs) {
  const store = usePresentationStore

  let stopPulse: (() => void) | null = null
  const clearPulse = () => {
    stopPulse?.()
    stopPulse = null
  }
  signal.addEventListener('abort', clearPulse, { once: true })

  try {
    const resolvedRoute = resolveRoute(scene.route)

    if (!isSameRoute(pathname, resolvedRoute)) {
      await navigate({
        to: resolvedRoute,
        params: scene.routeParams,
        search: scene.searchParams
          ? (prev: Record<string, unknown>) => ({ ...prev, ...scene.searchParams })
          : undefined,
      } as Parameters<typeof navigate>[0])
    } else if (scene.searchParams) {
      await navigate({
        search: (prev: Record<string, unknown>) => ({ ...prev, ...scene.searchParams }),
      } as Parameters<typeof navigate>[0])
    }
    if (signal.aborted) return

    if (scene.waitForSelector) {
      await waitForElement(targetSelector(scene.waitForSelector), 5000, signal)
    }
    if (signal.aborted) return

    store.getState().setPlaybackStatus('playing')

    const steps = buildTimeline(scene)
    let narrationDurationMs = 0

    for (const step of steps) {
      if (signal.aborted) return

      if (step.kind === 'camera') {
        const targets = resolveTargets(step.camera.target)
        await panTo(driver, targets, { behavior: step.camera.behavior })
      }

      if (step.kind === 'highlight') {
        const keys = Array.isArray(step.highlight.target) ? step.highlight.target : [step.highlight.target]
        store.getState().setActiveTargets(keys)
        store.getState().setActiveCallout(step.highlight.callout?.text ?? null)

        clearPulse()
        const targets = resolveTargets(step.highlight.target)
        if (targets[0]) stopPulse = driver.pulse(targets[0], { style: step.highlight.style ?? 'spotlight' })
      }

      if (step.kind === 'narrate') {
        const provider = getNarrationProvider(step.narration.providerId)
        const handle = await provider.prepare(step.narration)
        narrationDurationMs = handle.durationMs
        await playNarration(provider, handle, scene.subtitles, signal)
      }

      if (step.kind === 'wait') {
        await pausableDelay(step.ms, {
          signal,
          getStatus: () => store.getState().playbackStatus,
          getSpeed: () => store.getState().speed,
          onTick: (delta) => store.getState().setElapsedMsInScene(store.getState().elapsedMsInScene + delta),
        })
      }

      if (step.kind === 'custom') {
        await runCustomAction(step.type, step.payload, { sceneId: scene.id, signal })
      }
    }
    if (signal.aborted) return

    // Top the scene up to its floor duration (authored `duration` or
    // narration length, whichever's greater) minus whatever real time a
    // narrate/wait step already spent — this is what paces a text-only
    // scene with no narration audio, where playing narration resolves
    // near-instantly and would otherwise race through every scene.
    const floorMs = computeSceneDurationMs(scene, narrationDurationMs)
    const remainingMs = floorMs - store.getState().elapsedMsInScene
    if (remainingMs > 0) {
      await pausableDelay(remainingMs, {
        signal,
        getStatus: () => store.getState().playbackStatus,
        getSpeed: () => store.getState().speed,
        onTick: (delta) => store.getState().setElapsedMsInScene(store.getState().elapsedMsInScene + delta),
      })
    }
    if (signal.aborted) return

    if (scene.interactivePause) {
      await runInteractivePause(scene.interactivePause, resolveTargets(scene.highlight?.target ?? []), signal)
    }
    if (signal.aborted) return

    if (scene.onComplete) {
      window.dispatchEvent(new CustomEvent(scene.onComplete.event, { detail: scene.onComplete.payload }))
    }

    if (store.getState().playbackStatus !== 'error') {
      store.getState().next()
    }
  } finally {
    clearPulse()
    signal.removeEventListener('abort', clearPulse)
  }
}

async function playNarration(
  provider: NarrationProvider,
  handle: NarrationHandle,
  subtitles: SubtitleCue[] | undefined,
  signal: AbortSignal
): Promise<void> {
  const store = usePresentationStore
  const stopSubtitles = scheduleSubtitles(subtitles, handle, signal)

  const unsubscribeControl = store.subscribe((state, prev) => {
    if (state.playbackStatus !== prev.playbackStatus) {
      if (state.playbackStatus === 'paused') provider.pause(handle)
      else if (state.playbackStatus === 'playing' && prev.playbackStatus === 'paused') provider.resume(handle)
    }
    if (state.speed !== prev.speed && handle.audio) {
      handle.audio.playbackRate = state.speed
    }
  })

  const abortPromise = new Promise<void>((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true })
  })

  await Promise.race([provider.play(handle, { rate: store.getState().speed }), abortPromise])
  if (signal.aborted) provider.stop(handle)

  unsubscribeControl()
  stopSubtitles()
  store.getState().setActiveSubtitle(null)
}

function scheduleSubtitles(
  cues: SubtitleCue[] | undefined,
  handle: NarrationHandle,
  signal: AbortSignal
): () => void {
  if (!cues || cues.length === 0) return () => {}

  const activeCueFor = (ms: number) => cues.find((c) => ms >= c.startMs && ms < c.endMs)?.text ?? null

  if (handle.audio) {
    const audio = handle.audio
    const onTimeUpdate = () => {
      const ms = audio.currentTime * 1000
      usePresentationStore.getState().setActiveSubtitle(activeCueFor(ms))
      usePresentationStore.getState().setElapsedMsInScene(ms)
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => audio.removeEventListener('timeupdate', onTimeUpdate)
  }

  const start = Date.now()
  const intervalId = window.setInterval(() => {
    const ms = Date.now() - start
    usePresentationStore.getState().setActiveSubtitle(activeCueFor(ms))
    usePresentationStore.getState().setElapsedMsInScene(ms)
  }, 150)
  const onAbort = () => window.clearInterval(intervalId)
  signal.addEventListener('abort', onAbort, { once: true })
  return () => {
    window.clearInterval(intervalId)
    signal.removeEventListener('abort', onAbort)
  }
}

async function runInteractivePause(
  pause: SceneInteractivePause,
  targets: HTMLElement[],
  signal: AbortSignal
): Promise<void> {
  const store = usePresentationStore
  store.getState().setAwaitingInteraction(true, pause.prompt)

  await new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }

    // Covers 'manual-next' implicitly: clicking Next in PlaybackControls
    // advances the store's scene index directly, which aborts this
    // scene's run — no dedicated resumeOn branch needed for it.
    const unsubscribeStore = store.subscribe((state, prev) => {
      if (prev.isAwaitingUserInteraction && !state.isAwaitingUserInteraction) finish()
    })

    let timeoutId: number | undefined
    if (pause.resumeOn === 'timeout') {
      timeoutId = window.setTimeout(
        () => store.getState().resolveInteraction(),
        pause.timeoutMs ?? DEFAULT_INTERACTIVE_TIMEOUT_MS
      )
    }

    let targetCleanup: (() => void) | null = null
    if (pause.resumeOn === 'target-interaction' && targets[0]) {
      const el = targets[0]
      const onClick = () => store.getState().resolveInteraction()
      el.addEventListener('click', onClick, { once: true })
      targetCleanup = () => el.removeEventListener('click', onClick)
    }

    const onAbort = () => finish()
    signal.addEventListener('abort', onAbort, { once: true })

    function cleanup() {
      unsubscribeStore()
      if (timeoutId) window.clearTimeout(timeoutId)
      targetCleanup?.()
      signal.removeEventListener('abort', onAbort)
    }
  })

  store.getState().setAwaitingInteraction(false)
}
