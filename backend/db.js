// db.js - PostgreSQL connection pool
// Uses the DATABASE_URL environment variable (set this in your .env file
// locally, or in your hosting provider's environment variables when deployed).

const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL || "";

// A plain Postgres container has no TLS, so talking to it over SSL fails. That
// database is reached by service hostname (e.g. `db`), not `localhost`, so the
// host alone is not enough to detect it — an explicit `sslmode=disable` is the
// reliable signal. Everything else (Neon, Render, ...) does need TLS.
const sslDisabled =
  connectionString.includes("sslmode=disable") ||
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const pool = new Pool({
  connectionString,
  ssl: sslDisabled ? false : { rejectUnauthorized: false }, // needed for most free Postgres hosts (Neon, Render, etc.)
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

module.exports = pool;
