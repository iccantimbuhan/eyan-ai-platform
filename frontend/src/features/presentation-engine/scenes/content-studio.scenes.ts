import { registerCustomAction } from '../engine/custom-action-registry'
import { resolveTargetElement } from '../engine/scene-manager'
import type { SceneDefinition } from '../types/scene'

// Must match backend/prisma/seed-demo-content.ts's DEMO_CONTENT_STUDIO_PROJECT_ID
// exactly — a fixed id so these scenes can route straight into a known,
// fully-populated project workspace instead of a fresh/empty one. The two
// files can't share a literal across the frontend/backend boundary, so this
// coupling is deliberate and documented on both sides.
const DEMO_PROJECT_ID = 'demo-content-studio-project'

/**
 * A tiny, generic, module-owned custom action — the engine's designed
 * escape hatch (see engine/custom-action-registry.ts) for the one thing the
 * fixed action vocabulary can't express: "click this real element." Does
 * exactly what a real user's click would do — no engine change, no new
 * capability, nothing module-specific baked into the engine itself.
 *
 * Deliberately NOT a "press Escape" action: a synthetic Escape keydown
 * dispatched on document also triggers the Presentation Engine's own
 * global Escape-to-exit shortcut (use-presentation-keyboard-shortcuts.ts),
 * silently ending the whole tour instead of just closing a dialog. Closing
 * a Sheet/Dialog live in a scene must click its real close button instead
 * (see the 'ui.sheet-close' target added to components/ui/sheet.tsx).
 */
registerCustomAction('content-studio.click-target', async (payload) => {
  const target = payload?.target
  if (typeof target !== 'string') return
  resolveTargetElement(target)?.click()
})

const WORKSPACE_ROUTE = '/app/content-studio/$projectId'
const WORKSPACE_ROUTE_PARAMS = { projectId: DEMO_PROJECT_ID }

export const contentStudioScenes: SceneDefinition[] = [
  {
    id: 'content-studio.overview',
    module: 'content-studio',
    title: 'Project Overview',
    route: '/app/content-studio',
    waitForSelector: 'content-studio.recent-projects',
    duration: 7000,
    narration: {
      text: 'Every campaign starts here — one workspace per client, one source of truth for everything a team creates together.',
    },
    camera: { target: 'content-studio.recent-projects' },
    highlight: {
      target: 'content-studio.recent-projects',
      style: 'spotlight',
      callout: { text: 'Every project, organized and ready to pick up.' },
    },
  },
  {
    id: 'content-studio.new-project',
    module: 'content-studio',
    title: 'Start a new engagement',
    route: '/app/content-studio',
    duration: 6000,
    narration: {
      text: 'A new engagement takes one click to set up — content, images, video, and brand guidelines all live together from the very first draft.',
    },
    camera: { target: 'content-studio.new-project' },
    highlight: {
      target: 'content-studio.new-project',
      style: 'glow',
      callout: { text: 'One click. A fully connected workspace.' },
    },
  },
  {
    id: 'content-studio.pipeline',
    module: 'content-studio',
    title: 'A pipeline view of everything in flight',
    route: '/app/content-studio',
    duration: 6000,
    narration: {
      text: 'A content pipeline view keeps track of what is in progress, in review, and published — across every project, at a glance.',
    },
    camera: { target: 'content-studio.content-pipeline' },
    highlight: { target: 'content-studio.content-pipeline', style: 'spotlight' },
  },
  {
    id: 'content-studio.workspace.intro',
    module: 'content-studio',
    title: 'Nimbus Coffee Co. — Spring Launch',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'content' },
    waitForSelector: 'content-studio.workspace.header',
    duration: 6500,
    narration: {
      text: "This is Nimbus Coffee Co.'s Spring launch — a single workspace carrying one campaign from first draft all the way to a published post.",
    },
    camera: { target: 'content-studio.workspace.header' },
    highlight: {
      target: 'content-studio.workspace.header',
      style: 'glow',
      callout: { text: 'One project. Every stage of production.' },
    },
  },
  {
    id: 'content-studio.workspace.content.templates',
    module: 'content-studio',
    title: 'Content: start from a proven template',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'content' },
    waitForSelector: 'content-studio.workspace.content.templates',
    duration: 9000,
    timeline: [
      { kind: 'camera', camera: { target: 'content-studio.workspace.content.templates' } },
      {
        kind: 'highlight',
        highlight: {
          target: 'content-studio.workspace.content.templates',
          style: 'spotlight',
          callout: { text: 'Real templates. Reused, not reinvented.' },
        },
      },
      {
        kind: 'narrate',
        narration: {
          text: 'Every piece of content starts from a proven template, pulled straight from the shared Prompt Library — nobody starts from a blank page.',
        },
      },
      { kind: 'wait', ms: 800 },
      {
        kind: 'custom',
        type: 'content-studio.click-target',
        payload: { target: 'content-studio.workspace.content.template-card' },
      },
      { kind: 'wait', ms: 3200 },
    ],
  },
  {
    id: 'content-studio.workspace.content.generate',
    module: 'content-studio',
    title: 'Content: generate in your brand voice',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'content' },
    duration: 7000,
    narration: {
      text: "Fill in a few details, and AI drafts the first version in your brand's voice — grounded in the same Brand Kit the whole team already agreed on.",
    },
    camera: { target: 'content-studio.workspace.content.generate-form' },
    highlight: {
      target: 'content-studio.workspace.content.generate-form',
      style: 'spotlight',
      callout: { text: 'Generation that already sounds like you.' },
    },
  },
  {
    id: 'content-studio.workspace.content.history',
    module: 'content-studio',
    title: 'Content: a full paper trail',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'content' },
    duration: 7000,
    narration: {
      text: 'Every version is kept, not overwritten — so a marketer can compare drafts, reuse an old one, or hand a past version straight to a client.',
    },
    camera: { target: 'content-studio.workspace.content.history' },
    highlight: { target: 'content-studio.workspace.content.history', style: 'glow' },
  },
  {
    id: 'content-studio.workspace.images.generate',
    module: 'content-studio',
    title: 'Images: on-brand visuals on demand',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'images' },
    waitForSelector: 'content-studio.workspace.images.generate-form',
    duration: 6500,
    narration: {
      text: 'Visuals work the same way — one prompt, and Nimbus gets on-brand imagery in seconds instead of a stock-photo search.',
    },
    camera: { target: 'content-studio.workspace.images.generate-form' },
    highlight: {
      target: 'content-studio.workspace.images.generate-form',
      style: 'spotlight',
      callout: { text: 'From prompt to product photography.' },
    },
  },
  {
    id: 'content-studio.workspace.images.gallery',
    module: 'content-studio',
    title: 'Images: a growing visual library',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'images' },
    duration: 7500,
    narration: {
      text: 'Every image generated for this project lands in one gallery — easy to compare, reuse across formats, or hand off for review.',
    },
    camera: { target: 'content-studio.workspace.images.gallery' },
    highlight: {
      target: 'content-studio.workspace.images.gallery',
      style: 'spotlight',
      callout: { text: 'A growing visual library, not a folder of downloads.' },
    },
  },
  {
    id: 'content-studio.workspace.brand.kit',
    module: 'content-studio',
    title: 'Brand Kit: consistency by design',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'brand-kits' },
    waitForSelector: 'content-studio.workspace.brand.kit',
    duration: 7500,
    narration: {
      text: 'Colors, tone of voice, approved language — defined once in a Brand Kit, and every future generation inherits it automatically.',
    },
    camera: { target: 'content-studio.workspace.brand.kit' },
    highlight: {
      target: 'content-studio.workspace.brand.kit',
      style: 'spotlight',
      callout: { text: 'Consistency, enforced by design — not by memory.' },
    },
  },
  {
    id: 'content-studio.workspace.video.generate',
    module: 'content-studio',
    title: 'Video: AI-assisted pre-production',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'video' },
    waitForSelector: 'content-studio.workspace.video.generate-form',
    duration: 7000,
    narration: {
      text: 'AI drafts scripts, storyboards, and thumbnails from a single brief — the heavy lifting of pre-production, done in minutes instead of days.',
    },
    camera: { target: 'content-studio.workspace.video.generate-form' },
    highlight: {
      target: 'content-studio.workspace.video.generate-form',
      style: 'spotlight',
      callout: { text: 'Pre-production, accelerated.' },
    },
  },
  {
    id: 'content-studio.workspace.video.assets',
    module: 'content-studio',
    title: 'Video: a complete production kit',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'video' },
    duration: 7000,
    narration: {
      text: 'Scripts and storyboards land together, grouped by video — everything a production team needs to start shooting, in one place.',
    },
    camera: { target: 'content-studio.workspace.video.assets' },
    highlight: { target: 'content-studio.workspace.video.assets', style: 'glow' },
  },
  {
    id: 'content-studio.workspace.assets.library',
    module: 'content-studio',
    title: 'Assets: one searchable library',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'assets' },
    waitForSelector: 'content-studio.workspace.assets.library',
    duration: 9000,
    timeline: [
      { kind: 'camera', camera: { target: 'content-studio.workspace.assets.library' } },
      {
        kind: 'highlight',
        highlight: {
          target: 'content-studio.workspace.assets.library',
          style: 'spotlight',
          callout: { text: 'One library. Every asset, ever produced.' },
        },
      },
      {
        kind: 'narrate',
        narration: {
          text: 'Every asset this project has ever produced — content, images, video, brand guidelines — lives in one searchable library.',
        },
      },
      { kind: 'wait', ms: 1000 },
      {
        kind: 'custom',
        type: 'content-studio.click-target',
        payload: { target: 'content-studio.workspace.assets.card' },
      },
      { kind: 'wait', ms: 600 },
      {
        kind: 'narrate',
        narration: {
          text: "Open any asset, and its full history — prompt, output, reviews, and versions — is right there. Nothing to dig for.",
        },
      },
      { kind: 'wait', ms: 3200 },
      {
        kind: 'custom',
        type: 'content-studio.click-target',
        payload: { target: 'ui.sheet-close' },
      },
      { kind: 'wait', ms: 500 },
    ],
  },
  {
    id: 'content-studio.workspace.review.queue',
    module: 'content-studio',
    title: 'Review: quality assurance, built in',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'review' },
    waitForSelector: 'content-studio.workspace.review.queue',
    duration: 7000,
    narration: {
      text: 'Nothing publishes without a second set of eyes. A real approval workflow keeps quality consistent as a team — and a client list — grows.',
    },
    camera: { target: 'content-studio.workspace.review.queue' },
    highlight: {
      target: 'content-studio.workspace.review.queue',
      style: 'spotlight',
      callout: { text: 'Quality assurance, built into the workflow.' },
    },
  },
  {
    id: 'content-studio.workspace.publishing.queue',
    module: 'content-studio',
    title: 'Publishing: scheduled, not scattered',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'publishing' },
    waitForSelector: 'content-studio.workspace.publishing.queue',
    duration: 7000,
    narration: {
      text: 'Once approved, publishing is scheduled — not fired blind — with every destination and date tracked in a single queue.',
    },
    camera: { target: 'content-studio.workspace.publishing.queue' },
    highlight: {
      target: 'content-studio.workspace.publishing.queue',
      style: 'spotlight',
      callout: { text: 'Publishing on your schedule, not by accident.' },
    },
  },
  {
    id: 'content-studio.workspace.analytics.overview',
    module: 'content-studio',
    title: 'Analytics: measuring what worked',
    route: WORKSPACE_ROUTE,
    routeParams: WORKSPACE_ROUTE_PARAMS,
    searchParams: { tab: 'analytics' },
    waitForSelector: 'content-studio.workspace.analytics.overview',
    duration: 7500,
    narration: {
      text: 'Every generation, every review, every publish rolls up here — so a team can see what actually worked, not just what shipped.',
    },
    camera: { target: 'content-studio.workspace.analytics.overview' },
    highlight: {
      target: 'content-studio.workspace.analytics.overview',
      style: 'spotlight',
      callout: { text: 'Real performance data, not guesswork.' },
    },
  },
  {
    id: 'content-studio.prompt-library',
    module: 'content-studio',
    title: 'Your best work, reusable forever',
    route: '/app/content-studio/prompt-library',
    waitForSelector: 'content-studio.new-prompt',
    duration: 6500,
    narration: {
      text: "The prompts that worked get saved once here, and reused on every future project — Nimbus's best brief becomes every client's head start.",
    },
    camera: { target: 'content-studio.new-prompt' },
    highlight: {
      target: 'content-studio.new-prompt',
      style: 'spotlight',
      callout: { text: 'Your best work, reusable forever.' },
    },
  },
  {
    id: 'content-studio.dashboard-stats',
    module: 'content-studio',
    title: 'Every project, one rollup',
    route: '/app/content-studio/dashboard',
    waitForSelector: 'content-studio.dashboard-stats',
    duration: 6500,
    narration: {
      text: 'Zoom out, and every project ever run shows up here — one rollup across every client, every campaign, every asset produced.',
    },
    camera: { target: 'content-studio.dashboard-stats' },
    highlight: {
      target: 'content-studio.dashboard-stats',
      style: 'spotlight',
      callout: { text: 'Every project, one rollup.' },
    },
  },
  {
    id: 'content-studio.dashboard-activity',
    module: 'content-studio',
    title: 'The complete lifecycle',
    route: '/app/content-studio/dashboard',
    duration: 7500,
    narration: {
      text: 'Plan it, generate it, brand it, review it, publish it, measure it — one platform, start to finish. That is the AI Content Studio.',
    },
    camera: { target: 'content-studio.dashboard-activity' },
    highlight: {
      target: 'content-studio.dashboard-activity',
      style: 'glow',
      callout: { text: 'Plan. Generate. Review. Publish. Measure.' },
    },
  },
]
