import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
      return trimmed && !trimmed.startsWith("--");
    })
    .join("\n");
}

function splitSqlStatements(sql: string) {
  const cleaned = stripSqlLineComments(sql);
  const statements: string[] = [];

  let current = "";
  let quote: "'" | '"' | null = null;
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

    if (char === "'" || char === '"') {
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

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const executedResult = await pool.query("SELECT filename FROM schema_migrations");
  const executed = new Set(executedResult.rows.map((row: { filename: string }) => row.filename));

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    if (executed.has(file)) continue;

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");

      logger.info(`Applied migration: ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error({ error, file }, `Migration failed: ${file}`);
      throw error;
    } finally {
      client.release();
    }
  }

  await pool.end();
}

run().catch((error) => {
  logger.error({ error }, "Migration failed");
  process.exit(1);
});