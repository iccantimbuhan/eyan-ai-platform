import type { NextFunction, Request, Response } from "express";

export function requireRole(...roles: string[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const userRoles = req.user.roles.map((r) => r.role.name);

    const allowed = roles.some((role) =>
      userRoles.includes(role)
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
}
