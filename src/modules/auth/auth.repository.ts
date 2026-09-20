import { query, withTransaction } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";
import { AppError } from "../../common/errors/app-error.js";
import type { AuthUserRecord } from "./auth.types.js";

type RegisterRole = "admin" | "member";

function getGymSeed(gymId: string) {
  const knownGyms: Record<string, { name: string; city: string; state: string; ownerName: string; ownerEmail: string; planName: string }> = {
    nagpur: {
      name: "MyGym Nagpur",
      city: "Nagpur",
      state: "Maharashtra",
      ownerName: "Gym Owner",
      ownerEmail: "nagpur@gymms.in",
      planName: "enterprise"
    }
  };

  return (
    knownGyms[gymId] ?? {
      name: `MyGym ${gymId}`,
      city: null,
      state: null,
      ownerName: "Gym Owner",
      ownerEmail: null,
      planName: "basic"
    }
  );
}

export const authRepository = {
  async findByEmailOrUsername(username: string) {
    const normalizedUsername = username.trim().toLowerCase();

    const rows = await query<AuthUserRecord[]>(
      `
      SELECT
        u.id,
        u.gym_id,
        m.id AS member_id,
        u.email,
        u.password_hash,
        u.full_name,
        u.phone,
        u.is_active,
        string_agg(r.name, ',' ORDER BY r.name) AS roles_csv
      FROM users u
      LEFT JOIN members m ON m.user_id = u.id
      LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
      LEFT JOIN roles r ON r.id = ura.role_id
      WHERE LOWER(TRIM(u.email)) = $1 OR LOWER(split_part(TRIM(u.email), '@', 1)) = $1
      GROUP BY u.id, m.id
      LIMIT 1
      `,
      [normalizedUsername]
    );

    return rows[0] ?? null;
  },

  async createRegisteredUser(input: {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    gymId: string;
    role: RegisterRole;
  }) {
    return withTransaction(async (connection) => {
      const userId = makeId();
      const memberId = input.role === "member" ? makeId() : null;
      const gym = getGymSeed(input.gymId);

      await connection.query(
        `
        INSERT INTO gyms (id, name, city, state, owner_name, owner_email, plan_name, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          owner_name = EXCLUDED.owner_name,
          owner_email = EXCLUDED.owner_email,
          plan_name = EXCLUDED.plan_name,
          status = 'active'
        `,
        [input.gymId, gym.name, gym.city, gym.state, gym.ownerName, gym.ownerEmail, gym.planName]
      );

      const roleResult = await connection.query(
        "SELECT id FROM roles WHERE name = $1 LIMIT 1",
        [input.role]
      );

      const roleId = roleResult.rows[0]?.id as string | undefined;
      if (!roleId) {
        throw new AppError(500, "ROLE_NOT_FOUND", `Role '${input.role}' is not configured`);
      }

      await connection.query(
        "INSERT INTO users (id, gym_id, email, password_hash, full_name, phone) VALUES ($1, $2, $3, $4, $5, $6)",
        [userId, input.gymId, input.email, input.passwordHash, input.name, input.phone]
      );

      await connection.query(
        "INSERT INTO user_role_assignments (id, user_id, role_id) VALUES ($1, $2, $3)",
        [makeId(), userId, roleId]
      );

      if (input.role === "member" && memberId) {
        await connection.query(
          "INSERT INTO members (id, user_id, gym_id, status, join_date) VALUES ($1, $2, $3, 'active', CURRENT_DATE)",
          [memberId, userId, input.gymId]
        );
      }

      return { userId, memberId };
    });
  },

  async saveRefreshToken(input: { userId: string; tokenHash: string; expiresAt: string }) {
    await query(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [makeId(), input.userId, input.tokenHash, input.expiresAt]
    );
  },

  async findRefreshToken(tokenHash: string) {
    const rows = await query<AuthUserRecord[]>(
      `
      SELECT
        rt.id,
        rt.user_id,
        rt.expires_at,
        rt.revoked_at,
        u.email,
        u.gym_id,
        u.full_name,
        m.id AS member_id,
        string_agg(r.name, ',' ORDER BY r.name) AS roles_csv
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      LEFT JOIN members m ON m.user_id = u.id
      LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
      LEFT JOIN roles r ON r.id = ura.role_id
      WHERE rt.token_hash = $1
      GROUP BY rt.id, u.id, u.email, u.gym_id, u.full_name, m.id
      LIMIT 1
      `,
      [tokenHash]
    );

    return rows[0] ?? null;
  },

  async revokeRefreshToken(tokenHash: string) {
    await query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL",
      [tokenHash]
    );
  }
};