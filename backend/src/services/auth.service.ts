import { userRepository } from "../repositories/user.repository.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

import type {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponse,
  RefreshResponse,
} from "../dto/auth.dto.js";

import {
  ConflictError,
  UnauthorizedError,
} from "../errors/auth.error.js";

type AuthenticatedUser = NonNullable<
  Awaited<ReturnType<typeof userRepository.findById>>
>;

export class AuthService {
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await userRepository.findByEmail(dto.email);

    if (existing) {
      throw new ConflictError("Email already registered.");
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await userRepository.saveRefreshToken(
      user.id,
      refreshToken
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials.");
    }

    const valid = await verifyPassword(
      dto.password,
      user.passwordHash
    );

    if (!valid) {
      throw new UnauthorizedError("Invalid credentials.");
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await userRepository.saveRefreshToken(
      user.id,
      refreshToken
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refresh(
    dto: RefreshTokenDto
  ): Promise<RefreshResponse> {
    let payload;

    try {
      payload = verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    const user = await userRepository.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    if (
      !user.refreshToken ||
      user.refreshToken !== dto.refreshToken
    ) {
      throw new UnauthorizedError("Refresh token mismatch.");
    }

    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = signAccessToken(newPayload);
    const refreshToken = signRefreshToken(newPayload);

    await userRepository.updateRefreshToken(
      user.id,
      refreshToken
    );

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async logout(userId: string): Promise<void> {
    await userRepository.deleteRefreshToken(userId);
  }

  async me(user: AuthenticatedUser) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
