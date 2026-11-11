import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

// Pooled Neon URL (-pooler) for app traffic. Use DATABASE_URL_UNPOOLED for migrations.
const globalForPool = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPool.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (!globalForPool.pgPool) {
  globalForPool.pgPool = pool;
  // Lets Vercel Fluid compute close idle connections before the function suspends.
  attachDatabasePool(pool);
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
