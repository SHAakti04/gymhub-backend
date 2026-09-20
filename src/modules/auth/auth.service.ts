import bcrypt from "bcryptjs";
import { AppError } from "../../common/errors/app-error.js";
import { hashValue } from "../../common/utils/crypto.util.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../config/auth.js";
import { authRepository } from "./auth.repository.js";
import type { AuthResponse } from "./auth.types.js";

function mapUser(record: {
  id: string;
  gym_id: string | null;
  member_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  roles_csv: string | null;
}) {
  const roles = record.roles_csv ? record.roles_csv.split(",") : ["member"];
  return {
    id: record.id,
    email: record.email,
    name: record.full_name,
    phone: record.phone,
    gymId: record.gym_id,
    memberId: record.member_id,
    roles,
    primaryRole: roles[0] ?? "member"
  };
}

async function buildAuthResponse(baseUser: ReturnType<typeof mapUser>): Promise<AuthResponse> {
  const payload = {
    sub: baseUser.id,
    email: baseUser.email,
    gymId: baseUser.gymId,
    memberId: baseUser.memberId,
    roles: baseUser.roles,
    primaryRole: baseUser.primaryRole
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const decoded = verifyRefreshToken(refreshToken) as { exp?: number };
  const expiresAt = decoded.exp
    ? new Date(decoded.exp * 1000).toISOString().slice(0, 19).replace("T", " ")
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

  await authRepository.saveRefreshToken({
    userId: baseUser.id,
    tokenHash: hashValue(refreshToken),
    expiresAt
  });

  return { user: baseUser, accessToken, refreshToken };
}

export const authService = {
  async login(input: { username: string; password: string }) {
    const username = input.username.trim();
    const password = input.password.trim();

    const record = await authRepository.findByEmailOrUsername(username);
    if (!record || !record.is_active) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
    }

    const matched = await bcrypt.compare(password, record.password_hash);
    if (!matched) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
    }

    return buildAuthResponse(mapUser(record));
  },

async register(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  gymId?: string;
  role?: "admin" | "member";
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await authRepository.findByEmailOrUsername(email);
  if (existing) {
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  await authRepository.createRegisteredUser({
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    passwordHash,
    gymId: input.gymId ?? "nagpur",
    role: input.role ?? "member"
  });

  const created = await authRepository.findByEmailOrUsername(email);
  if (!created) {
    throw new AppError(500, "REGISTER_FAILED", "Unable to create account");
  }

  return buildAuthResponse(mapUser(created));
},

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is required");
    }

    try {
      verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    const tokenRecord = await authRepository.findRefreshToken(hashValue(refreshToken));

    if (!tokenRecord || tokenRecord.revoked_at) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid");
    }

    const roles = tokenRecord.roles_csv ? String(tokenRecord.roles_csv).split(",") : ["member"];
    const user = {
      id: tokenRecord.user_id!,
      email: tokenRecord.email,
      name: tokenRecord.full_name,
      phone: null,
      gymId: tokenRecord.gym_id,
      memberId: tokenRecord.member_id ?? null,
      roles,
      primaryRole: roles[0] ?? "member"
    };

    await authRepository.revokeRefreshToken(hashValue(refreshToken));
    return buildAuthResponse(user);
  },

  async logout(refreshToken: string) {
    await authRepository.revokeRefreshToken(hashValue(refreshToken));
    return { success: true };
  }
};