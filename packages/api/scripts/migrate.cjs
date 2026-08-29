/**
 * Apply schema.sql to Supabase Postgres.
 * Usage: node scripts/migrate.cjs
 */
require("dotenv").config({ path: require("node:path").join(__dirname, "../.env") });
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Missing DATABASE_URL in packages/api/.env");
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "../supabase/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Supabase Postgres\n");
  console.log("Applying schema.sql...");

  try {
    await client.query(sql);
    console.log("Schema applied successfully.\n");
  } catch (err) {
    const msg = err.message ?? String(err);
    if (msg.includes("already exists")) {
      console.log("Schema partially exists — continuing (safe to re-run individual statements manually).\n");
    } else {
      throw err;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
