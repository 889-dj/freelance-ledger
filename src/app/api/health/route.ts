import { query } from "@/lib/db";

export async function GET() {
  try {
    const [row] = await query<{ db: string; now: string }>(
      "select current_database() as db, now()::text as now",
    );
    return Response.json({ ok: true, ...row });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
