// Run AFTER the hashed-key code is deployed: removes plaintext keys from the database.
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await c.connect();
await c.query("alter table users drop column if exists api_key");
console.log("api_key column dropped");
await c.end();
