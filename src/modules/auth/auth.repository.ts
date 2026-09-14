import type { ResultSetHeader, RowDataPacket } from "mysql2";
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

    const rows = await query<(AuthUserRecord & RowDataPacket)[]>(
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
        GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ',') AS roles_csv
      FROM users u
      LEFT JOIN members m ON m.user_id = u.id
      LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
      LEFT JOIN roles r ON r.id = ura.role_id
      WHERE LOWER(TRIM(u.email)) = ? OR LOWER(SUBSTRING_INDEX(TRIM(u.email), '@', 1)) = ?
      GROUP BY u.id, m.id
      LIMIT 1
      `,
      [normalizedUsername, normalizedUsername]
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
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          city = VALUES(city),
          state = VALUES(state),
          owner_name = VALUES(owner_name),
          owner_email = VALUES(owner_email),
          plan_name = VALUES(plan_name),
          status = 'active'
        `,
        [input.gymId, gym.name, gym.city, gym.state, gym.ownerName, gym.ownerEmail, gym.planName]
      );

      const [roleRows] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM roles WHERE name = ? LIMIT 1",
        [input.role]
      );

      const roleId = roleRows[0]?.id as string | undefined;
      if (!roleId) {
        throw new AppError(500, "ROLE_NOT_FOUND", `Role '${input.role}' is not configured`);
      }

      await connection.query(
        "INSERT INTO users (id, gym_id, email, password_hash, full_name, phone) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, input.gymId, input.email, input.passwordHash, input.name, input.phone]
      );

      await connection.query(
        "INSERT INTO user_role_assignments (id, user_id, role_id) VALUES (?, ?, ?)",
        [makeId(), userId, roleId]
      );

      if (input.role === "member" && memberId) {
        await connection.query(
          "INSERT INTO members (id, user_id, gym_id, status, join_date) VALUES (?, ?, ?, 'active', CURDATE())",
          [memberId, userId, input.gymId]
        );
      }

      return { userId, memberId };
    });
  },

  async saveRefreshToken(input: { userId: string; tokenHash: string; expiresAt: string }) {
    await query<ResultSetHeader>(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [makeId(), input.userId, input.tokenHash, input.expiresAt]
    );
  },

  async findRefreshToken(tokenHash: string) {
    const rows = await query<RowDataPacket[]>(
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
        GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ',') AS roles_csv
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      LEFT JOIN members m ON m.user_id = u.id
      LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
      LEFT JOIN roles r ON r.id = ura.role_id
      WHERE rt.token_hash = ?
      GROUP BY rt.id, m.id
      LIMIT 1
      `,
      [tokenHash]
    );

    return rows[0] ?? null;
  },

  async revokeRefreshToken(tokenHash: string) {
    await query<ResultSetHeader>(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL",
      [tokenHash]
    );
  }
};