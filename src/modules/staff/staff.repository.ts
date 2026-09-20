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
    return query(
      `${selectStaffSql}
       WHERE gym_id = $1
       ORDER BY created_at DESC`,
      [gymId],
    );
  },

  async publicTrainers(gymId = "nagpur") {
    return query(
      `${selectStaffSql}
       WHERE gym_id = $1
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
    const rows = await query(
      `${selectStaffSql}
       WHERE id = $1 AND gym_id = $2
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

      const existingResult = await connection.query(
        "SELECT id FROM users WHERE LOWER(TRIM(email)) = $1 LIMIT 1",
        [input.email.trim().toLowerCase()],
      );

      if (existingResult.rows[0]) {
        throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
      }

      const roleResult = await connection.query(
        "SELECT id FROM roles WHERE name = 'staff' LIMIT 1",
      );

      const roleId = roleResult.rows[0]?.id as string | undefined;
      if (!roleId) {
        throw new AppError(500, "ROLE_NOT_FOUND", "Role 'staff' is not configured");
      }

      await connection.query(
        `
        INSERT INTO users
          (id, gym_id, email, password_hash, full_name, phone, must_change_password)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
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

      await connection.query(
        "INSERT INTO user_role_assignments (id, user_id, role_id) VALUES ($1, $2, $3)",
        [makeId(), userId, roleId],
      );

      await connection.query(
        `
        INSERT INTO staff
          (id, user_id, gym_id, name, email, phone, role_name, salary, status, join_date,
           avatar_url, specialty, public_bio, experience_years, certifications, instagram)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
    await query(
      `
      UPDATE staff
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          role_name = COALESCE($4, role_name),
          salary = COALESCE($5, salary),
          status = COALESCE($6, status),
          join_date = COALESCE($7, join_date),
          avatar_url = COALESCE($8, avatar_url),
          specialty = COALESCE($9, specialty),
          public_bio = COALESCE($10, public_bio),
          experience_years = COALESCE($11, experience_years),
          certifications = COALESCE($12, certifications),
          instagram = COALESCE($13, instagram)
      WHERE id = $14 AND gym_id = $15
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