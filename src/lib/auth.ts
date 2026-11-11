import { query } from "@/lib/db";

export type User = { id: number; name: string; email: string };

/** Workspace key from `Authorization: Bearer <key>` or `?key=<key>`. */
export function keyFromRequest(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return new URL(req.url).searchParams.get("key");
}

export async function userForKey(key: string | null): Promise<User | null> {
  if (!key) return null;
  const rows = await query<User>(
    "select id, name, email from users where api_key = $1",
    [key],
  );
  return rows[0] ?? null;
}
