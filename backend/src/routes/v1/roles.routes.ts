import { Router, type Router as ExpressRouter } from 'express'
import { RolesController } from '../../controllers/roles.controller.js'
import { authenticate } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validation.middleware.js'
import { createRoleValidator, roleIdParamValidator, updateRolePermissionsValidator, updateRoleValidator } from '../../validators/roles.validator.js'

const router: ExpressRouter = Router()

// Authentication is retained; page visibility is the only permission gate for now.
router.use(authenticate)
router.get('/', RolesController.getRoles)
router.post('/', createRoleValidator, validate, RolesController.createRole)
router.patch('/:id', updateRoleValidator, validate, RolesController.updateRole)
router.patch('/:id/permissions', updateRolePermissionsValidator, validate, RolesController.updateRolePermissions)
router.delete('/:id', roleIdParamValidator, validate, RolesController.deleteRole)

export default router
