import mysql, { type Pool, type PoolOptions, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { getEnv } from "./env";

type GlobalWithPool = typeof globalThis & { __mysqlPool?: Pool };
const g = globalThis as GlobalWithPool;

function buildPool(): Pool {
  const env = getEnv();
  const options: PoolOptions = {
    uri: env.DATABASE_URL,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    timezone: "Z",
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
    decimalNumbers: true,
  };
  return mysql.createPool(options);
}

export function getPool(): Pool {
  if (!g.__mysqlPool) g.__mysqlPool = buildPool();
  return g.__mysqlPool;
}

export type SqlParam =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | Buffer;

/**
 * Run a SELECT and return all rows as plain objects.
 * Use `?` placeholders.
 */
export async function query<T = RowDataPacket>(
  sql: string,
  params: ReadonlyArray<SqlParam> = [],
): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params as SqlParam[]);
  return rows as unknown as T[];
}

/** Run a SELECT and return at most one row (or null). */
export async function queryOne<T = RowDataPacket>(
  sql: string,
  params: ReadonlyArray<SqlParam> = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run an INSERT/UPDATE/DELETE and return affected/insertId. */
export async function execute(
  sql: string,
  params: ReadonlyArray<SqlParam> = [],
): Promise<{ affectedRows: number; insertId: number }> {
  const pool = getPool();
  const [result] = await pool.execute(sql, params as SqlParam[]);
  const r = result as ResultSetHeader;
  return { affectedRows: r.affectedRows, insertId: r.insertId };
}

/**
 * Stringify a JS value for storage in a JSON column.
 * Returns null if the value is null/undefined.
 */
export function toJsonParam(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  return JSON.stringify(v);
}

/**
 * JSON columns may come back as a parsed object (MySQL native JSON +
 * driver auto-parsing) or as a string (MariaDB / older MySQL). Normalize.
 */
export function parseJsonColumn<T = unknown>(v: unknown): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  }
  return v as T;
}

/** Convert a MySQL DATETIME column (Date | string | null) into a Date | null. */
export function toDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "string") {
    const d = new Date(v.replace(" ", "T") + (v.endsWith("Z") ? "" : "Z"));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Convert a TINYINT(1) column to boolean. */
export function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return Boolean(v);
}

/** Run a callback inside a transaction with a borrowed connection. */
export async function transaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}
