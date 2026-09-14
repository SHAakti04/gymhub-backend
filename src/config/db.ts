import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { env } from "./env.js";

export const pool: Pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false
});

export async function assertDbConnection() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
}

export async function query<T = RowDataPacket[] | ResultSetHeader>(sql: string, params: unknown[] = []) {
  const [rows] = await pool.query(sql, params);
  return rows as T;
}

export async function withTransaction<T>(work: (connection: PoolConnection) => Promise<T>) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}