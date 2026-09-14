import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { pool } from "../config/db.js";
import { logger } from "../config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

function stripSqlLineComments(sql: string) {
  return sql
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("--") && !trimmed.startsWith("#");
    })
    .join("\n");
}

function splitSqlStatements(sql: string) {
  const cleaned = stripSqlLineComments(sql);
  const statements: string[] = [];

  let current = "";
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;

  for (const char of cleaned) {
    current += char;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) quote = null;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }

    if (char === ";") {
      const statement = current.slice(0, -1).trim();
      if (statement) statements.push(statement);
      current = "";
    }
  }

  const finalStatement = current.trim();
  if (finalStatement) statements.push(finalStatement);

  return statements;
}

async function ensureDatabaseExists() {
  const bootstrap = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: false
  });

  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    logger.info(`Database ${env.DB_NAME} is ready`);
  } finally {
    await bootstrap.end();
  }
}

async function run() {
  await ensureDatabaseExists();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [executedRows] = await pool.query("SELECT filename FROM schema_migrations");
  const executed = new Set((executedRows as Array<{ filename: string }>).map((row) => row.filename));

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    if (executed.has(file)) continue;

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const statements = splitSqlStatements(sql);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const statement of statements) {
        await connection.query(statement);
      }

      await connection.query("INSERT INTO schema_migrations (filename) VALUES (?)", [file]);
      await connection.commit();

      logger.info(`Applied migration ${file} (${statements.length} statements)`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  await pool.end();
}

run().catch((error) => {
  logger.error({ error }, "Migration failed");
  process.exit(1);
});