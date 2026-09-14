import type { RowDataPacket } from "mysql2";
import { query } from "../../config/db.js";

export const paymentSettingsRepository = {
  async getPublic(gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `
      SELECT gym_id, upi_id, payee_name, qr_image_url, instructions, is_active
      FROM gym_payment_settings
      WHERE gym_id = ? AND is_active = 1
      LIMIT 1
      `,
      [gymId]
    );

    return rows[0] ?? null;
  },

  async getAdmin(gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `
      SELECT gym_id, upi_id, payee_name, qr_image_url, instructions, is_active
      FROM gym_payment_settings
      WHERE gym_id = ?
      LIMIT 1
      `,
      [gymId]
    );

    return rows[0] ?? null;
  },

  async upsert(input: {
    gymId: string;
    upiId: string | null;
    payeeName: string | null;
    qrImageUrl: string | null;
    instructions: string | null;
    isActive: boolean;
  }) {
    await query(
      `
      INSERT INTO gym_payment_settings
        (gym_id, upi_id, payee_name, qr_image_url, instructions, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        upi_id = VALUES(upi_id),
        payee_name = VALUES(payee_name),
        qr_image_url = VALUES(qr_image_url),
        instructions = VALUES(instructions),
        is_active = VALUES(is_active)
      `,
      [
        input.gymId,
        input.upiId,
        input.payeeName,
        input.qrImageUrl,
        input.instructions,
        input.isActive ? 1 : 0
      ]
    );

    return this.getAdmin(input.gymId);
  }
};