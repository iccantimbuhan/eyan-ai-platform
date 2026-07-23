import type { Request, Response } from "express";

import { ProjectsService } from "../services/projects.service.js";
import { ApiResponse } from "../utils/api-response.js";

const projectsService = new ProjectsService();

export class ProjectsController {
  private static getId(req: Request): string {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
  }

  static async getProjects(req: Request, res: Response) {
    console.log(">>> CONTROLLER getProjects");
    const result = await projectsService.list({
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search?.toString(),
    });

    return ApiResponse.paginated(
      res,
      result.items,
      result.pagination,
      200,
      "Projects retrieved successfully."
    );
  }

  static async getProject(req: Request, res: Response) {
    const project = await projectsService.getById(
      ProjectsController.getId(req)
    );

    return ApiResponse.success(
      res,
      project,
      200,
      "Project retrieved successfully."
    );
  }

  static async createProject(req: Request, res: Response) {
    const project = await projectsService.create(req.body);

    return ApiResponse.success(
      res,
      project,
      201,
      "Project created successfully."
    );
  }

  static async updateProject(req: Request, res: Response) {
    const project = await projectsService.update(
      ProjectsController.getId(req),
      req.body
    );

    return ApiResponse.success(
      res,
      project,
      200,
      "Project updated successfully."
    );
  }

  static async deleteProject(req: Request, res: Response) {
    await projectsService.delete(
      ProjectsController.getId(req)
    );

    return ApiResponse.success(
      res,
      null,
      200,
      "Project deleted successfully."
    );
  }
}
