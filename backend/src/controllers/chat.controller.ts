import type { Request, Response } from "express";
import { ChatService } from "../services/chat.service.js";
import { ApiResponse } from "../utils/api-response.js";
import { ChatSchema } from "../validators/chat.validator.js";

export class ChatController {
  static async chat(req: Request, res: Response) {
    const parsed = ChatSchema.safeParse(req.body);

    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message ?? 'Validation error'
      return ApiResponse.error(res, errMsg, 400)
    }

    const service = new ChatService();

    const result = await service.chat(parsed.data.messages);

    return ApiResponse.success(res, result);
  }

  static async stream(req: Request, res: Response) {
    const parsed = ChatSchema.safeParse(req.body);

    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message ?? 'Validation error'
      return res.status(400).json({
        success: false,
        error: errMsg,
      })
    }

    const service = new ChatService();

    return service.stream(parsed.data.messages, res);
  }
}