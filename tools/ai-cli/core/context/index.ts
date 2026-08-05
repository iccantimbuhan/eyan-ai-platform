// The Context Engine's public API. Future commands should import only from this
// file — never reach into registry.ts, which is a private implementation detail
// free to change (array, map, generated registry, etc.) without breaking callers.
export { loadContextSource } from './loader.js'
export { listContextDomains, resolveContext } from './resolver.js'
