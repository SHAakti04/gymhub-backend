import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../../config/db.js";

export interface PayrollInput {
  staffId: string;
  amount: number;
  month: string;
  method: string;
  txnRef?: string | null;
  notes?: string | null;
}

export const payrollRepository = {
  async list(gymId: string) {
    return query<RowDataPacket[]>(
      `SELECT p.id, p.staff_id, s.name AS staff_name, s.email AS staff_email,
              p.amount, p.month_key, p.method, p.txn_ref, p.notes, p.paid_at, p.created_at
       FROM payroll_entries p
       JOIN staff s ON s.id = p.staff_id
       WHERE p.gym_id = ?
       ORDER BY p.paid_at DESC`,
      [gymId],
    );
  },

  async findStaff(staffId: string, gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `SELECT id, name FROM staff WHERE id = ? AND gym_id = ? LIMIT 1`,
      [staffId, gymId],
    );
    return rows[0] ?? null;
  },

  async create(gymId: string, input: PayrollInput) {
    const payrollId = randomUUID();
    const cashflowId = randomUUID();
    const paidAt = new Date();

    return withTransaction(async (connection) => {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO payroll_entries (id, staff_id, gym_id, amount, month_key, method, txn_ref, notes, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payrollId,
          input.staffId,
          gymId,
          input.amount,
          input.month,
          input.method,
          input.txnRef ?? null,
          input.notes ?? null,
          paidAt,
        ],
      );

      await connection.execute<ResultSetHeader>(
        `INSERT INTO cashflow_entries (id, gym_id, entry_type, category, amount, entry_date, notes)
         VALUES (?, ?, 'expense', 'payroll', ?, CURDATE(), ?)`,
        [cashflowId, gymId, input.amount, input.notes ?? `Payroll for ${input.month}`],
      );

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT p.id, p.staff_id, s.name AS staff_name, s.email AS staff_email,
                p.amount, p.month_key, p.method, p.txn_ref, p.notes, p.paid_at, p.created_at
         FROM payroll_entries p
         JOIN staff s ON s.id = p.staff_id
         WHERE p.id = ? AND p.gym_id = ?
         LIMIT 1`,
        [payrollId, gymId],
      );

      return rows[0];
    });
  },
};