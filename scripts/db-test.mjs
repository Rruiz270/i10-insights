// Quick connectivity + schema-existence check.
// Usage: node --env-file=.env.local scripts/db-test.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const version = await sql`SELECT version()`;
console.log("connected:", version[0].version.split(",")[0]);

const schemas = await sql`
  SELECT schema_name FROM information_schema.schemata
  WHERE schema_name NOT IN ('pg_catalog', 'pg_toast', 'information_schema')
  ORDER BY schema_name
`;
console.log("existing schemas:", schemas.map((r) => r.schema_name));

const insightsExists = schemas.some((r) => r.schema_name === "insights");
console.log("insights schema present:", insightsExists);
