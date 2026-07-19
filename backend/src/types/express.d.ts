import type { User } from "../generated/prisma/models.js";

declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

export {};
