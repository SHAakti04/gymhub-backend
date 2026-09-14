import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "./env.js";
import { AppError } from "../common/errors/app-error.js";

export interface TokenPayload {
  sub: string;
  email: string;
  gymId: string | null;
  memberId: string | null;
  roles: string[];
  primaryRole: string;
}

export function signAccessToken(payload: TokenPayload) {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: "mygym-backend"
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, options);
}

export function signRefreshToken(payload: TokenPayload) {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: "mygym-backend"
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET as Secret, options);
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET as Secret) as TokenPayload;
  } catch {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Access token is invalid or expired");
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET as Secret) as TokenPayload;
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }
}