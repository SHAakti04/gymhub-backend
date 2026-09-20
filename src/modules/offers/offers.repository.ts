import { query } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

export interface OfferRow {
  id: string;
  gym_id: string;
  code: string;
  title: string;
  discount_pct: string;
  valid_from: string;
  valid_to: string;
  active: boolean;
  applies_to: "all" | "new" | "renewal";
  created_at: string;
}

export const offersRepository = {
  async listForGym(gymId: string) {
    return query(`SELECT * FROM offers WHERE gym_id = $1 ORDER BY created_at DESC`, [gymId]);
  },

  async listActiveForGym(gymId: string) {
    return query(
      `SELECT * FROM offers WHERE gym_id = $1 AND active = TRUE AND valid_from <= CURRENT_DATE AND valid_to >= CURRENT_DATE ORDER BY valid_to ASC`,
      [gymId],
    );
  },

  async getById(id: string, gymId: string) {
    const rows = await query(`SELECT * FROM offers WHERE id = $1 AND gym_id = $2 LIMIT 1`, [id, gymId]);
    return rows[0] ?? null;
  },

  async getActiveByCode(gymId: string, code: string) {
    const rows = await query(
      `SELECT * FROM offers WHERE gym_id = $1 AND code = $2 AND active = TRUE AND valid_from <= CURRENT_DATE AND valid_to >= CURRENT_DATE LIMIT 1`,
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
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        id,
        input.gymId,
        input.code,
        input.title,
        input.discountPct,
        input.validFrom,
        input.validTo,
        input.active,
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

    if (patch.code !== undefined) { fields.push("code"); values.push(patch.code); }
    if (patch.title !== undefined) { fields.push("title"); values.push(patch.title); }
    if (patch.discountPct !== undefined) { fields.push("discount_pct"); values.push(patch.discountPct); }
    if (patch.validFrom !== undefined) { fields.push("valid_from"); values.push(patch.validFrom); }
    if (patch.validTo !== undefined) { fields.push("valid_to"); values.push(patch.validTo); }
    if (patch.active !== undefined) { fields.push("active"); values.push(patch.active); }
    if (patch.appliesTo !== undefined) { fields.push("applies_to"); values.push(patch.appliesTo); }

    if (fields.length === 0) return this.getById(id, gymId);

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    await query(
      `UPDATE offers SET ${setClauses} WHERE id = $${fields.length + 1} AND gym_id = $${fields.length + 2}`,
      [...values, id, gymId],
    );
    return this.getById(id, gymId);
  },

  async remove(id: string, gymId: string) {
    await query(`DELETE FROM offers WHERE id = $1 AND gym_id = $2`, [id, gymId]);
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
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
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