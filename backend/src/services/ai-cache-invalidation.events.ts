import { EventEmitter } from "node:events";

export const AI_CORE_CACHE_INVALIDATE = "ai-core:cache:invalidate";

// Decouples AiAuditService (which knows *when* something changed) from
// AiRoutingService (which knows *what* to do about it) — AiAuditService
// never imports AiRoutingService directly. AiRoutingService's in-memory
// cache (TDD §8) subscribes to this event instead of AiAuditService calling
// it by name, so a future second cache consumer can subscribe without
// AiAuditService changing at all.
export const aiCoreCacheEvents = new EventEmitter();
// Unlimited listeners: in production exactly one AiRoutingService singleton
// subscribes, but tests legitimately construct many short-lived instances
// via dependency injection (see ai-routing.service.test.ts) — each one a
// real, intentional subscriber, not a leak.
aiCoreCacheEvents.setMaxListeners(0);

// The subset of AiAuditAction values that mean "a resolved routing chain
// may now be stale" — Capability/Brain/RoutingPolicy/Prompt changes.
// Provider credential and MCP tool allowance changes do not invalidate the
// routing cache (they don't change *which* provider/model/prompt a Brain
// resolves to, only how a call to that provider authenticates or which
// tools it may use).
export const CACHE_INVALIDATING_ACTIONS = new Set([
  "CAPABILITY_CREATED",
  "CAPABILITY_UPDATED",
  "CAPABILITY_DELETED",
  "BRAIN_CREATED",
  "BRAIN_UPDATED",
  "BRAIN_DELETED",
  "ROUTING_POLICY_CHANGED",
  "PROMPT_VERSION_ACTIVATED",
  "PROMPT_VERSION_ROLLED_BACK",
]);
