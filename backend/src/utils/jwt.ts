import jwt, {
  type Secret,
  type JwtPayload as DefaultJwtPayload,
} from "jsonwebtoken";

import { env } from "../config/env.js";

export interface JwtPayload {
  userId: string;
  email: string;
}

const ACCESS_SECRET: Secret = env.jwtSecret;
const REFRESH_SECRET: Secret = env.refreshTokenSecret;

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: env.jwtExpiresIn as any,
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: env.refreshTokenExpiresIn as any,
  });
}

export function verifyAccessToken(
  token: string
): JwtPayload & DefaultJwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload &
    DefaultJwtPayload;
}

export function verifyRefreshToken(
  token: string
): JwtPayload & DefaultJwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload &
    DefaultJwtPayload;
}

export function decodeToken(
  token: string
): (JwtPayload & DefaultJwtPayload) | null {
  const decoded = jwt.decode(token);

  if (!decoded || typeof decoded === "string") {
    return null;
  }

  return decoded as JwtPayload & DefaultJwtPayload;
}
