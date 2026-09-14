import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { query, withTransaction } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";
import { AppError } from "../../common/errors/app-error.js";

export interface StaffInput {
  name: string;
  email: string;
  phone?: string | null;
  roleName: string;
  salary?: number;
  status?: string;
  joinDate?: string | null;
  avatarUrl?: string | null;
  specialty?: string | null;
  publicBio?: string | null;
  experienceYears?: number | null;
  certifications?: string | null;
  instagram?: string | null;
  passwordHash?: string;
}

const selectStaffSql = `
  SELECT
    id,
    user_id,
    gym_id,
    name,
    email,
    phone,
    role_name,
    salary,
    status,
    join_date,
    avatar_url,
    specialty,
    public_bio,
    experience_years,
    certifications,
    instagram,
    created_at
  FROM staff
`;

export const staffRepository = {
  async list(gymId: string) {
    return query<RowDataPacket[]>(
      `${selectStaffSql}
       WHERE gym_id = ?
       ORDER BY created_at DESC`,
      [gymId],
    );
  },

  async publicTrainers(gymId = "nagpur") {
    return query<RowDataPacket[]>(
      `${selectStaffSql}
       WHERE gym_id = ?
         AND status = 'active'
       ORDER BY
         CASE
           WHEN role_name = 'trainer' THEN 1
           WHEN role_name = 'manager' THEN 2
           WHEN role_name = 'receptionist' THEN 3
           ELSE 4
         END,
         created_at DESC`,
      [gymId],
    );
  },

  async findById(id: string, gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `${selectStaffSql}
       WHERE id = ? AND gym_id = ?
       LIMIT 1`,
      [id, gymId],
    );
    return rows[0] ?? null;
  },

  async create(gymId: string, input: StaffInput) {
    if (!input.passwordHash) {
      throw new AppError(500, "STAFF_PASSWORD_REQUIRED", "Staff password hash is required");
    }

    return withTransaction(async (connection) => {
      const staffId = makeId();
      const userId = makeId();

      const [existingUsers] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
        [input.email.trim().toLowerCase()],
      );

      if (existingUsers[0]) {
        throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
      }

      const [roleRows] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM roles WHERE name = 'staff' LIMIT 1",
      );

      const roleId = roleRows[0]?.id as string | undefined;
      if (!roleId) {
        throw new AppError(500, "ROLE_NOT_FOUND", "Role 'staff' is not configured");
      }

      await connection.query<ResultSetHeader>(
        `
        INSERT INTO users
          (id, gym_id, email, password_hash, full_name, phone, must_change_password)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        `,
        [
          userId,
          gymId,
          input.email.trim().toLowerCase(),
          input.passwordHash,
          input.name.trim(),
          input.phone?.trim() || null,
        ],
      );

      await connection.query<ResultSetHeader>(
        "INSERT INTO user_role_assignments (id, user_id, role_id) VALUES (?, ?, ?)",
        [makeId(), userId, roleId],
      );

      await connection.query<ResultSetHeader>(
        `
        INSERT INTO staff
          (id, user_id, gym_id, name, email, phone, role_name, salary, status, join_date,
           avatar_url, specialty, public_bio, experience_years, certifications, instagram)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          staffId,
          userId,
          gymId,
          input.name.trim(),
          input.email.trim().toLowerCase(),
          input.phone?.trim() || null,
          input.roleName,
          input.salary ?? 0,
          input.status ?? "active",
          input.joinDate ?? new Date().toISOString().slice(0, 10),
          input.avatarUrl ?? null,
          input.specialty ?? null,
          input.publicBio ?? null,
          input.experienceYears ?? null,
          input.certifications ?? null,
          input.instagram ?? null,
        ],
      );

      return this.findById(staffId, gymId);
    });
  },

  async update(id: string, gymId: string, input: Partial<StaffInput>) {
    await query<ResultSetHeader>(
      `
      UPDATE staff
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          role_name = COALESCE(?, role_name),
          salary = COALESCE(?, salary),
          status = COALESCE(?, status),
          join_date = COALESCE(?, join_date),
          avatar_url = COALESCE(?, avatar_url),
          specialty = COALESCE(?, specialty),
          public_bio = COALESCE(?, public_bio),
          experience_years = COALESCE(?, experience_years),
          certifications = COALESCE(?, certifications),
          instagram = COALESCE(?, instagram)
      WHERE id = ? AND gym_id = ?
      `,
      [
        input.name ?? null,
        input.email?.trim().toLowerCase() ?? null,
        input.phone ?? null,
        input.roleName ?? null,
        input.salary ?? null,
        input.status ?? null,
        input.joinDate ?? null,
        input.avatarUrl ?? null,
        input.specialty ?? null,
        input.publicBio ?? null,
        input.experienceYears ?? null,
        input.certifications ?? null,
        input.instagram ?? null,
        id,
        gymId,
      ],
    );

    return this.findById(id, gymId);
  },
};