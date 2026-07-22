import { api } from "@/services/api";
import type { User } from "../types/user";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<ApiResponse<User[]>>("/users");
  return data.data;
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<ApiResponse<User>>(`/users/${id}`);
  return data.data;
}
