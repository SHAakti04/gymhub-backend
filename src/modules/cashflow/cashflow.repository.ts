import { randomUUID } from "node:crypto";
import { query } from "../../config/db.js";

export interface CashflowInput {
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  notes?: string | null;
}

export const cashflowRepository = {
  async list(gymId: string) {
    return query(
      `SELECT id, gym_id, entry_type, category, amount, entry_date, notes, created_at
       FROM cashflow_entries
       WHERE gym_id = $1
       ORDER BY entry_date DESC, created_at DESC`,
      [gymId],
    );
  },

  async create(gymId: string, input: CashflowInput) {
    const id = randomUUID();

    await query(
      `INSERT INTO cashflow_entries (id, gym_id, entry_type, category, amount, entry_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, gymId, input.type, input.category, input.amount, input.date, input.notes ?? null],
    );

    const rows = await query(
      `SELECT id, gym_id, entry_type, category, amount, entry_date, notes, created_at
       FROM cashflow_entries
       WHERE id = $1 AND gym_id = $2
       LIMIT 1`,
      [id, gymId],
    );

    return rows[0];
  },
};