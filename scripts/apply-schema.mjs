// Usage: node --env-file=.env.local scripts/apply-schema.mjs
// Applies schema.sql over the DIRECT (unpooled) connection and seeds a demo user.
import fs from "node:fs";
import pg from "pg";

const c = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await c.connect();
await c.query(fs.readFileSync("schema.sql", "utf8"));
const key = "wk_" + crypto.randomUUID().replaceAll("-", "");
const r = await c.query(
  `insert into users (name, email, api_key) values ('Demo Freelancer','demo@example.com',$1)
   on conflict (email) do nothing returning api_key`,
  [key],
);
if (r.rows[0]) {
  fs.appendFileSync(".env.local", `\nDEMO_WORKSPACE_KEY=${r.rows[0].api_key}\n`);
  console.log("Seeded demo user; key saved to .env.local as DEMO_WORKSPACE_KEY");
} else console.log("Demo user already exists");
console.log((await c.query("select count(*) from users")).rows[0]);
await c.end();
