import type { UserResponseDto } from "./user.dto.js";

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserResponseDto;
  tokens: AuthTokens;
}

export interface RefreshResponse {
  tokens: AuthTokens;
}
