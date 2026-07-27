import { api } from '@/services/api'
import type { ApiResponse } from '@/types/api'

import type {
  BrandKit,
  CreateBrandKitInput,
  UpdateBrandKitInput,
} from '../types/brand-kit'

export const brandKitsApi = {
  async listBrandKits(projectId: string): Promise<BrandKit[]> {
    const { data } = await api.get<ApiResponse<BrandKit[]>>('/brand-kits', {
      params: { projectId },
    })

    return data.data
  },

  async getBrandKit(id: string): Promise<BrandKit> {
    const { data } = await api.get<ApiResponse<BrandKit>>(`/brand-kits/${id}`)

    return data.data
  },

  async createBrandKit(payload: CreateBrandKitInput): Promise<BrandKit> {
    const { data } = await api.post<ApiResponse<BrandKit>>(
      '/brand-kits',
      payload
    )

    return data.data
  },

  async updateBrandKit(
    id: string,
    payload: UpdateBrandKitInput
  ): Promise<BrandKit> {
    const { data } = await api.patch<ApiResponse<BrandKit>>(
      `/brand-kits/${id}`,
      payload
    )

    return data.data
  },

  async deleteBrandKit(id: string): Promise<void> {
    await api.delete(`/brand-kits/${id}`)
  },
}
