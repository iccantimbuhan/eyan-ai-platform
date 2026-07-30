import type { SceneDefinition } from '../types/scene'

export const contentStudioScenes: SceneDefinition[] = [
  {
    id: 'content-studio.overview',
    module: 'content-studio',
    title: 'AI Content Studio',
    route: '/app/content-studio',
    waitForSelector: 'content-studio.recent-projects',
    duration: 5000,
    narration: {
      text: 'Every project you create lives here — organized, searchable, and ready to pick up exactly where you left off.',
    },
    camera: { target: 'content-studio.recent-projects' },
    highlight: {
      target: 'content-studio.recent-projects',
      style: 'spotlight',
      callout: { text: 'Every project you create, in one place.' },
    },
  },
  {
    id: 'content-studio.new-project',
    module: 'content-studio',
    title: 'Start a new project',
    route: '/app/content-studio',
    duration: 4000,
    narration: {
      text: 'Starting a new project takes one click — content, images, video, and brand assets all live together from there.',
    },
    camera: { target: 'content-studio.new-project' },
    highlight: {
      target: 'content-studio.new-project',
      style: 'glow',
      callout: { text: 'One click to start a new content workspace.' },
    },
  },
  {
    id: 'content-studio.pipeline',
    module: 'content-studio',
    title: 'A pipeline view of everything in flight',
    route: '/app/content-studio',
    duration: 4000,
    narration: {
      text: 'A content pipeline view keeps track of what is in progress, in review, and published — across every project.',
    },
    camera: { target: 'content-studio.content-pipeline' },
    highlight: { target: 'content-studio.content-pipeline', style: 'spotlight' },
  },
  {
    id: 'content-studio.dashboard-stats',
    module: 'content-studio',
    title: 'Production Dashboard',
    route: '/app/content-studio/dashboard',
    waitForSelector: 'content-studio.dashboard-stats',
    duration: 5000,
    narration: {
      text: 'The Production Dashboard rolls up every project into one view — assets generated, models used, and brand kits in play.',
    },
    camera: { target: 'content-studio.dashboard-stats' },
    highlight: {
      target: 'content-studio.dashboard-stats',
      style: 'spotlight',
      callout: { text: 'Every project, rolled up into one view.' },
    },
  },
  {
    id: 'content-studio.dashboard-activity',
    module: 'content-studio',
    title: 'One unified activity feed',
    route: '/app/content-studio/dashboard',
    duration: 4000,
    narration: {
      text: 'A unified activity feed tracks every generation, review, and publish across the whole platform — no second timeline to check.',
    },
    camera: { target: 'content-studio.dashboard-activity' },
    highlight: { target: 'content-studio.dashboard-activity', style: 'glow' },
  },
  {
    id: 'content-studio.prompt-library',
    module: 'content-studio',
    title: 'Prompt Library',
    route: '/app/content-studio/prompt-library',
    waitForSelector: 'content-studio.new-prompt',
    duration: 4000,
    narration: {
      text: 'Save your best prompts once, and reuse them across every future project — no retyping the same brief twice.',
    },
    camera: { target: 'content-studio.new-prompt' },
    highlight: {
      target: 'content-studio.new-prompt',
      style: 'spotlight',
      callout: { text: 'Reusable prompts, saved once.' },
    },
  },
]
