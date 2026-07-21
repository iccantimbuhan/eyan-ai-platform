import type { Request, Response } from "express";

import type { CreateUserDto } from "../dto/user.dto.js";
import { usersService } from "../services/users.service.js";
import { ApiResponse } from "../utils/api-response.js";

export class UsersController {
  static async getUsers(req: Request, res: Response) {
    const result = await usersService.getUsers(req.query);

    return ApiResponse.paginated(
      res,
      result.data,
      result.meta,
      200,
      "Users retrieved successfully."
    );
  }

  static async getUser(
    req: Request<{ id: string }>,
    res: Response
  ) {
    const user = await usersService.getUserById(req.params.id);

    return ApiResponse.success(
      res,
      user,
      200,
      "User retrieved successfully."
    );
  }

  static async createUser(
    req: Request<{}, {}, CreateUserDto>,
    res: Response
  ) {
    const user = await usersService.createUser(req.body);

    return ApiResponse.success(
      res,
      user,
      201,
      "User created successfully."
    );
  }
}
