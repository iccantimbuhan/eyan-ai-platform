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
});

export type ChatRequest = z.infer<typeof ChatSchema>;
export type ChatMessage = z.infer<typeof MessageSchema>;