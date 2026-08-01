import type { Response } from "express";
import { aiConversationService, AiConversationService } from "./ai-conversation.service.js";
import { ApiError } from "../errors/api-error.js";
import { logger } from "../lib/logger.js";
import type { ChatMessage } from "../validators/chat.validator.js";

// The Brain Chat resolves against — see prisma/seed-ai-core.ts's
// seedGeneralChatBrain(). Sprint 4: this is the only AI-Core-specific
// knowledge left in ChatService; everything else (provider, model,
// streaming implementation, error classification) lives inside
// AiConversationService now. ChatController/ChatService together only ever
// resolve "Conversation -> Brain" — never a provider or model directly.
const GENERAL_CHAT_BRAIN_KEY = "general-chat-brain";

export interface ChatResult {
  model: string;
  response: string;
  createdAt: string;
  conversationId: string;
}

export class ChatService {
  constructor(private readonly conversationService: AiConversationService = aiConversationService) {}

  async chat(messages: ChatMessage[], conversationId?: string, actorId: string | null = null): Promise<ChatResult> {
    const result = await this.conversationService.converse({
      brainKey: GENERAL_CHAT_BRAIN_KEY,
      conversationId,
      messages,
      actorId,
    });

    return {
      model: result.model,
      response: result.content,
      createdAt: new Date().toISOString(),
      conversationId: result.conversationId,
    };
  }

  async stream(
    messages: ChatMessage[],
    res: Response,
    conversationId?: string,
    actorId: string | null = null
  ): Promise<void> {
    let streamStarted = false;

    try {
      const chunks = this.conversationService.streamConverse({
        brainKey: GENERAL_CHAT_BRAIN_KEY,
        conversationId,
        messages,
        actorId,
      });

      for await (const chunk of chunks) {
        if (!streamStarted) {
          streamStarted = true;
          res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, no-transform");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("X-Accel-Buffering", "no");
          res.setHeader("Transfer-Encoding", "chunked");
          // Additive, out-of-band — existing NDJSON body consumers are
          // unaffected; a conversation-aware caller can read this header to
          // continue the same conversation on its next request.
          res.setHeader("X-Ai-Conversation-Id", chunk.conversationId);
          res.flushHeaders();
        }

        // `raw` is the provider's own unmodified chunk object — writing it
        // straight back out reproduces the exact NDJSON wire format the
        // (unchanged) frontend already parses today.
        res.write(`${JSON.stringify(chunk.raw)}\n`);
      }

      res.end();
    } catch (error) {
      if (!streamStarted) {
        // Nothing sent yet — a normal thrown ApiError, forwarded to
        // Express's error handler exactly like the non-streaming path.
        throw error instanceof ApiError ? error : new ApiError(503, "Unable to connect to AI provider.");
      }

      // Headers/bytes are already on the wire — a fresh JSON error response
      // isn't valid HTTP at this point. Log full diagnostics server-side
      // (AiConversationService already logged the classified category; this
      // is the HTTP-layer half of that same failure) and destroy the
      // connection, same posture as the legacy stream() handler.
      logger.error("[ChatService] Streaming interrupted after response start", {
        message: error instanceof Error ? error.message : String(error),
      });

      if (!res.destroyed) {
        res.destroy(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}
