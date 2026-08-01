import { z } from "zod";

export const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(0).max(10000),
});

export const ChatSchema = z.object({
  messages: z
    .array(MessageSchema)
    .min(1, "At least one message is required")
    .max(100, "Too many messages"),
  // Sprint 4 (Conversation Engine) — optional and additive. Omitted: today's
  // exact stateless behavior (messages is the full self-contained exchange,
  // nothing persisted). Supplied: must be a conversationId returned by a
  // previous chat/stream call; messages is then just the new turn(s) to
  // append, with AI Core loading and prepending the stored history.
  conversationId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatSchema>;
export type ChatMessage = z.infer<typeof MessageSchema>;