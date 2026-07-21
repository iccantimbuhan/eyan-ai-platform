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

function getPrimaryRole(user: AuthenticatedUser): string {
  return user.roles[0]?.role.name ?? "Viewer";
}

function toUserResponse(user: AuthenticatedUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,

    // Backward compatibility
    role: getPrimaryRole(user),

    // RBAC
    roles: user.roles.map((r) => r.role.name),

    permissions: [
      ...new Set(
        user.roles.flatMap((r) =>
          r.role.permissions.map((p) => p.permission.name)
        )
      ),
    ],

    // Account status
    isActive: user.isActive,
    emailVerified: user.emailVerified,

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

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
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await userRepository.saveRefreshToken(
      user.id,
      refreshToken
    );

    return {
      user: toUserResponse(user),
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
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await userRepository.saveRefreshToken(
      user.id,
      refreshToken
    );

    return {
      user: toUserResponse(user),
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
    return toUserResponse(user);
  }
}
