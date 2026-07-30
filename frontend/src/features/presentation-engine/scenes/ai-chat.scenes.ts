import type { SceneDefinition } from '../types/scene'

export const aiChatScenes: SceneDefinition[] = [
  {
    id: 'ai-chat.overview',
    module: 'ai-chat',
    title: 'AI Chat',
    route: '/app/ai-chat',
    waitForSelector: 'ai-chat.chat-panel',
    duration: 5000,
    narration: {
      text: 'AI Chat is where conversations with your configured models happen, with full history kept per conversation.',
    },
    camera: { target: 'ai-chat.conversation-list' },
    highlight: {
      target: 'ai-chat.conversation-list',
      style: 'spotlight',
      callout: { text: 'Every conversation is saved here, ready to resume.' },
    },
  },
  {
    id: 'ai-chat.compose',
    module: 'ai-chat',
    title: 'Start a conversation',
    route: '/app/ai-chat',
    duration: 4000,
    narration: {
      text: 'Type a message here and it streams back in real time from your connected model.',
    },
    camera: { target: 'ai-chat.chat-panel' },
    highlight: { target: 'ai-chat.chat-panel', style: 'glow' },
  },
]
