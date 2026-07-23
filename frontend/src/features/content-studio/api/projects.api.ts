import { api } from '@/services/api'
import type {
  ApiResponse,
  PaginatedResponse,
} from '@/types/api'

import type { ContentProject, ProjectStatus } from '../types/project'

interface BackendProject {
  id: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectsResponse {
  items: ContentProject[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

function toContentProject(project: BackendProject): ContentProject {
  return {
    id: project.id,
    title: project.name,
    type: 'Project',
    status: 'Draft' as ProjectStatus,
    updatedAt: project.updatedAt,
  }
}

export const projectsApi = {
  async getProjects(params?: {
    page?: number
    pageSize?: number
    search?: string
  }): Promise<ProjectsResponse> {
    const { data } = await api.get<PaginatedResponse<BackendProject>>(
      '/projects',
      {
        params,
      }
    )

    return {
      items: data.data.map(toContentProject),
      pagination: data.meta,
    }
  },

  async getProject(id: string): Promise<ContentProject> {
    const { data } = await api.get<ApiResponse<BackendProject>>(
      `/projects/${id}`
    )

    return toContentProject(data.data)
  },

  async createProject(
    payload: CreateProjectRequest
  ): Promise<ContentProject> {
    const { data } = await api.post<ApiResponse<BackendProject>>(
      '/projects',
      payload
    )

    return toContentProject(data.data)
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  },
}
