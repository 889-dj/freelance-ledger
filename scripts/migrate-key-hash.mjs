// One-off, safe to re-run. Adds users.key_hash (SHA-256 of the key) and backfills it
// from the old plaintext api_key column. Leaves api_key in place so the previous
// deployment keeps working until the new one is live. Run scripts/drop-plain-keys.mjs after.
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await c.connect();
await c.query("alter table users add column if not exists key_hash text");
await c.query("alter table users alter column api_key drop not null");
const r = await c.query(
  "update users set key_hash = encode(sha256(convert_to(api_key,'UTF8')),'hex') where key_hash is null and api_key is not null",
);
await c.query("create unique index if not exists users_key_hash_key on users(key_hash)");
await c.query("alter table users alter column key_hash set not null");
console.log("backfilled:", r.rowCount);
await c.end();
