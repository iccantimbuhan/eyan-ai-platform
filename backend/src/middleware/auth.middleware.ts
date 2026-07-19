import type { NextFunction, Request, Response } from "express";

import { userRepository } from "../repositories/user.repository.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authHeader.substring(7);

    const payload = verifyAccessToken(token);

    const user = await userRepository.findById(payload.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    req.user = user;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}
