import type { ProjectStatus } from "../generated/prisma/enums.js";

export interface CreateProjectDto {
  name: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface ProjectResponseDto {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListProjectsQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
}
