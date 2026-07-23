import { Router, type Router as ExpressRouter } from "express";

import { ProjectsController } from "../../controllers/projects.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  createProjectValidator,
  updateProjectValidator,
  projectIdParamValidator,
  listProjectsValidator,
} from "../../validators/projects.validator.js";

const router: ExpressRouter = Router();

router.get(
  "/",
  authenticate,
  listProjectsValidator,
  validate,
  ProjectsController.getProjects
);

router.get(
  "/:id",
  authenticate,
  projectIdParamValidator,
  validate,
  ProjectsController.getProject
);

router.post(
  "/",
  authenticate,
  createProjectValidator,
  validate,
  ProjectsController.createProject
);

router.patch(
  "/:id",
  authenticate,
  projectIdParamValidator,
  updateProjectValidator,
  validate,
  ProjectsController.updateProject
);

router.delete(
  "/:id",
  authenticate,
  projectIdParamValidator,
  validate,
  ProjectsController.deleteProject
);

export default router;
