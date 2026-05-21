// Runs db/init.sql against the database URL in .env.
// Auto-creates the target database if it does not exist.
// Usage:  npm run db:init
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import mysql from "mysql2/promise";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "..");

// ---- minimal .env loader (no dotenv dependency) ----
const envPath = path.join(rootDir, ".env");
if (fs.existsSync(envPath)) {
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[db:init] DATABASE_URL is not set in .env");
  process.exit(1);
}

const sqlPath = path.join(rootDir, "db", "init.sql");
if (!fs.existsSync(sqlPath)) {
  console.error(`[db:init] Missing ${sqlPath}`);
  process.exit(1);
}
const sqlText = fs.readFileSync(sqlPath, "utf8");

// ---- parse DATABASE_URL to extract host/user/pass/db ----
let parsed;
try {
  parsed = new URL(dbUrl);
} catch {
  console.error("[db:init] DATABASE_URL is not a valid URL:", dbUrl);
  process.exit(1);
}
const dbName = parsed.pathname.replace(/^\//, "");
if (!dbName) {
  console.error(
    "[db:init] DATABASE_URL must include a database name, e.g. mysql://root@localhost:3306/ig_ai_command_center",
  );
  process.exit(1);
}

const connOptions = {
  host: parsed.hostname || "localhost",
  port: parsed.port ? Number(parsed.port) : 3306,
  user: decodeURIComponent(parsed.username || "root"),
  password: parsed.password ? decodeURIComponent(parsed.password) : "",
  multipleStatements: true,
};

// ---- step 1: ensure the database exists ----
{
  const bootstrap = await mysql.createConnection(connOptions);
  try {
    console.log(
      `[db:init] ensuring database \`${dbName}\` exists on ${connOptions.host}:${connOptions.port} ...`,
    );
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } catch (err) {
    console.error("[db:init] failed to create database:", err.message ?? err);
    await bootstrap.end().catch(() => {});
    process.exit(1);
  } finally {
    await bootstrap.end().catch(() => {});
  }
}

// ---- step 2: apply schema ----
const conn = await mysql.createConnection({ ...connOptions, database: dbName });
try {
  console.log(`[db:init] applying ${path.relative(rootDir, sqlPath)} ...`);
  await conn.query(sqlText);
  console.log(`[db:init] done. Database '${dbName}' is ready.`);
} catch (err) {
  console.error("[db:init] failed to apply schema:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await conn.end().catch(() => {});
}
