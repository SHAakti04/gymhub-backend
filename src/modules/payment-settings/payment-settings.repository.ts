import { query } from "../../config/db.js";

export const paymentSettingsRepository = {
  async getPublic(gymId: string) {
    const rows = await query(
      `
      SELECT gym_id, upi_id, payee_name, qr_image_url, instructions, is_active
      FROM gym_payment_settings
      WHERE gym_id = $1 AND is_active = TRUE
      LIMIT 1
      `,
      [gymId]
    );

    return rows[0] ?? null;
  },

  async getAdmin(gymId: string) {
    const rows = await query(
      `
      SELECT gym_id, upi_id, payee_name, qr_image_url, instructions, is_active
      FROM gym_payment_settings
      WHERE gym_id = $1
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
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (gym_id) DO UPDATE SET
        upi_id = EXCLUDED.upi_id,
        payee_name = EXCLUDED.payee_name,
        qr_image_url = EXCLUDED.qr_image_url,
        instructions = EXCLUDED.instructions,
        is_active = EXCLUDED.is_active
      `,
      [
        input.gymId,
        input.upiId,
        input.payeeName,
        input.qrImageUrl,
        input.instructions,
        input.isActive
      ]
    );

    return this.getAdmin(input.gymId);
  }
};