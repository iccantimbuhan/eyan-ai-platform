import type {
  CreateUserDto,
  ListUsersQueryDto,
  UserResponseDto,
} from "../dto/user.dto.js";

import { hashPassword } from "../utils/password.js";
import { userRepository } from "../repositories/user.repository.js";
import { paginate } from "../utils/pagination.js";

function toUserResponse(user: any): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,

    // Backward compatibility
    role: user.roles[0]?.role?.name ?? "",

    // RBAC
    roles: user.roles.map((r: any) => r.role.name),
    permissions: [
      ...new Set<string>(
        user.roles.flatMap((r: any) =>
          r.role.permissions.map((p: any) => p.permission.name)
        )
      ),
    ],

    isActive: user.isActive,
    emailVerified: user.emailVerified,

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class UsersService {
  async getUsers(query: ListUsersQueryDto) {
    const { page, pageSize, skip, take } = paginate(query);

    const [users, total] = await Promise.all([
      userRepository.findMany({
        skip,
        take,
        search: query.search,
        isActive: query.isActive,
      }),
      userRepository.count({
        search: query.search,
        isActive: query.isActive,
      }),
    ]);

    return {
      data: users.map(toUserResponse),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new Error("User not found.");
    }

    return toUserResponse(user);
  }

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await userRepository.findByEmail(dto.email);

    if (existing) {
      throw new Error("Email already exists.");
    }

    const roles = await userRepository.findRolesByNames(dto.roles);

    if (roles.length !== dto.roles.length) {
      throw new Error("One or more roles do not exist.");
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await userRepository.createWithRoles({
      name: dto.name,
      email: dto.email,
      passwordHash,
      roleIds: roles.map((role) => role.id),
    });

    return toUserResponse(user);
  }
}

export const usersService = new UsersService();
