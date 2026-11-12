import { createHash, randomBytes } from "node:crypto";
import { query } from "@/lib/db";

export type User = { id: number; name: string; email: string };

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** New workspace key. Only its SHA-256 hash is stored. */
export const generateKey = () => "wk_" + randomBytes(24).toString("base64url");

/** Workspace key from `Authorization: Bearer <key>` or `?key=<key>`. */
export function keyFromRequest(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return new URL(req.url).searchParams.get("key");
}

export async function userForKey(key: string | null): Promise<User | null> {
  if (!key) return null;
  const rows = await query<User>(
    "select id, name, email from users where key_hash = $1",
    [hashKey(key)],
  );
  return rows[0] ?? null;
}
