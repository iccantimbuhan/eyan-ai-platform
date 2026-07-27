import type { NextFunction, Request, Response } from "express";

export function requirePermission(...permissions: string[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const userPermissions = req.user.roles.flatMap((userRole) =>
      userRole.role.permissions.map(
        (permission) => permission.permission.name
      )
    );

    const allowed = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }

    next();
  };
}
