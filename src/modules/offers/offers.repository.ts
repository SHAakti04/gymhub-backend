import type { RowDataPacket } from "mysql2";
import { query } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

export interface OfferRow extends RowDataPacket {
  id: string;
  gym_id: string;
  code: string;
  title: string;
  discount_pct: string;
  valid_from: string;
  valid_to: string;
  active: number;
  applies_to: "all" | "new" | "renewal";
  created_at: string;
}

export const offersRepository = {
  async listForGym(gymId: string) {
    return query<OfferRow[]>(`SELECT * FROM offers WHERE gym_id = ? ORDER BY created_at DESC`, [gymId]);
  },

  async listActiveForGym(gymId: string) {
    return query<OfferRow[]>(
      `SELECT * FROM offers WHERE gym_id = ? AND active = 1 AND valid_from <= CURDATE() AND valid_to >= CURDATE() ORDER BY valid_to ASC`,
      [gymId],
    );
  },

  async getById(id: string, gymId: string) {
    const rows = await query<OfferRow[]>(`SELECT * FROM offers WHERE id = ? AND gym_id = ? LIMIT 1`, [id, gymId]);
    return rows[0] ?? null;
  },

  async getActiveByCode(gymId: string, code: string) {
    const rows = await query<OfferRow[]>(
      `SELECT * FROM offers WHERE gym_id = ? AND code = ? AND active = 1 AND valid_from <= CURDATE() AND valid_to >= CURDATE() LIMIT 1`,
      [gymId, code],
    );
    return rows[0] ?? null;
  },

  async create(input: {
    gymId: string;
    code: string;
    title: string;
    discountPct: number;
    validFrom: string;
    validTo: string;
    active: boolean;
    appliesTo: "all" | "new" | "renewal";
  }) {
    const id = makeId();
    await query(
      `INSERT INTO offers (id, gym_id, code, title, discount_pct, valid_from, valid_to, active, applies_to, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        input.gymId,
        input.code,
        input.title,
        input.discountPct,
        input.validFrom,
        input.validTo,
        input.active ? 1 : 0,
        input.appliesTo,
      ],
    );
    return this.getById(id, input.gymId);
  },

  async update(
    id: string,
    gymId: string,
    patch: Partial<{
      code: string;
      title: string;
      discountPct: number;
      validFrom: string;
      validTo: string;
      active: boolean;
      appliesTo: "all" | "new" | "renewal";
    }>,
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (patch.code !== undefined) { fields.push("code = ?"); values.push(patch.code); }
    if (patch.title !== undefined) { fields.push("title = ?"); values.push(patch.title); }
    if (patch.discountPct !== undefined) { fields.push("discount_pct = ?"); values.push(patch.discountPct); }
    if (patch.validFrom !== undefined) { fields.push("valid_from = ?"); values.push(patch.validFrom); }
    if (patch.validTo !== undefined) { fields.push("valid_to = ?"); values.push(patch.validTo); }
    if (patch.active !== undefined) { fields.push("active = ?"); values.push(patch.active ? 1 : 0); }
    if (patch.appliesTo !== undefined) { fields.push("applies_to = ?"); values.push(patch.appliesTo); }

    if (fields.length === 0) return this.getById(id, gymId);

    await query(`UPDATE offers SET ${fields.join(", ")} WHERE id = ? AND gym_id = ?`, [...values, id, gymId]);
    return this.getById(id, gymId);
  },

  async remove(id: string, gymId: string) {
    await query(`DELETE FROM offers WHERE id = ? AND gym_id = ?`, [id, gymId]);
  },

  async recordRedemption(input: {
    offerId: string;
    gymId: string;
    memberId: string;
    contextType: "renewal";
    contextId: string;
    discountPct: number;
    discountAmount: number;
  }) {
    await query(
      `INSERT INTO offer_redemptions
       (id, offer_id, gym_id, member_id, context_type, context_id, discount_pct, discount_amount, redeemed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        makeId(),
        input.offerId,
        input.gymId,
        input.memberId,
        input.contextType,
        input.contextId,
        input.discountPct,
        input.discountAmount,
      ],
    );
  },
};