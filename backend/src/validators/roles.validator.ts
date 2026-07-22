import { body, param } from 'express-validator'

const roleId = param('id').trim().notEmpty().withMessage('Role ID is required')
const roleFields = [
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Role name must be between 2 and 80 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('isActive').optional().isBoolean().withMessage('Status must be a boolean'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('permissions.*').optional().isString().trim().notEmpty().withMessage('Each permission must be a non-empty string'),
]

export const createRoleValidator = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Role name must be between 2 and 80 characters'),
  ...roleFields.slice(1),
]
export const updateRoleValidator = [roleId, ...roleFields]
export const updateRolePermissionsValidator = [roleId, body('permissions').isArray().withMessage('Permissions must be an array'), body('permissions.*').isString().trim().notEmpty().withMessage('Each permission must be a non-empty string')]
export const roleIdParamValidator = [roleId]
