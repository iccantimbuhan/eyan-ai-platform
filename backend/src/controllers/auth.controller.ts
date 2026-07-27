import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { ApiResponse } from "../utils/api-response.js";

const authService = new AuthService();

export class AuthController {
  static async register(req: Request, res: Response) {
    const result = await authService.register(req.body);

    return ApiResponse.success(res, result);
  }

  static async login(req: Request, res: Response) {
    const result = await authService.login(req.body);

    return ApiResponse.success(res, result);
  }

  static async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.body);

    return ApiResponse.success(res, result);
  }

  static async logout(req: Request, res: Response) {
    await authService.logout(req.user.id);

    return ApiResponse.success(res, {
      message: "Logged out successfully.",
    });
  }

  static async me(req: Request, res: Response) {
    const result = await authService.me(req.user);

    return ApiResponse.success(res, result);
  }
}
