import { Pool } from "pg";

const connectionString =
  process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";

if (!connectionString) {
  throw new Error(
    "DATABASE_URL or NETLIFY_DATABASE_URL environment variable is required",
  );
}

const pool = new Pool({
  connectionString,
});

export { pool };
