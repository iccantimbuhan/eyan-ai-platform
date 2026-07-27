import type { Request, Response } from 'express'
import type { CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from '../dto/role.dto.js'
import { rolesService } from '../services/roles.service.js'
import { ApiResponse } from '../utils/api-response.js'

export class RolesController {
  static async getRoles(_req: Request, res: Response) { return ApiResponse.success(res, await rolesService.getRoles(), 200, 'Roles retrieved successfully.') }
  static async getPermissions(_req: Request, res: Response) { return ApiResponse.success(res, await rolesService.getPermissions(), 200, 'Permissions retrieved successfully.') }
  static async createRole(req: Request<{}, {}, CreateRoleDto>, res: Response) { return ApiResponse.success(res, await rolesService.createRole(req.body), 201, 'Role created successfully.') }
  static async updateRole(req: Request<{ id: string }, {}, UpdateRoleDto>, res: Response) { return ApiResponse.success(res, await rolesService.updateRole(req.params.id, req.body), 200, 'Role updated successfully.') }
  static async updateRolePermissions(req: Request<{ id: string }, {}, UpdateRolePermissionsDto>, res: Response) { return ApiResponse.success(res, await rolesService.updateRolePermissions(req.params.id, req.body.permissions), 200, 'Role permissions updated successfully.') }
  static async deleteRole(req: Request<{ id: string }>, res: Response) { await rolesService.deleteRole(req.params.id); return res.status(204).send() }
}
