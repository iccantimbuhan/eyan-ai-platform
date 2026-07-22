export interface Role { id: string; name: string; description: string | null; isActive: boolean; userCount: number; permissions: string[]; createdAt: string; updatedAt: string }
export interface ApiResponse<T> { success: boolean; data: T }
