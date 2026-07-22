import { Router, type Router as ExpressRouter } from 'express'
import { RolesController } from '../../controllers/roles.controller.js'
import { authenticate } from '../../middleware/auth.middleware.js'

const router: ExpressRouter = Router()
router.get('/', authenticate, RolesController.getPermissions)

export default router
