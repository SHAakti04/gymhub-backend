import { Pool, types, type PoolClient } from "pg";
import { env } from "./env.js";

// Return JSON/JSONB columns as raw strings (same as MySQL behavior).
// This ensures existing JSON.parse() calls in repositories continue to work.
types.setTypeParser(114, (val: string) => val);   // json
types.setTypeParser(3802, (val: string) => val);  // jsonb

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 10,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function assertDbConnection() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

export async function query<T = Record<string, unknown>[]>(sql: string, params: unknown[] = []) {
  const result = await pool.query(sql, params);
  return result.rows as unknown as T;
}

export async function execute(sql: string, params: unknown[] = []) {
  return pool.query(sql, params);
}

export async function withTransaction<T>(work: (connection: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}