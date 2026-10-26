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

// TLS is configured explicitly below, so the sslmode parameter in the URL is
// redundant. Stripping it also silences pg's future-behaviour warning about
// sslmode aliases (pg v9 will adopt libpq semantics).
function withoutSslMode(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("uselibpqcompat");
    return parsed.toString();
  } catch {
    return url;
  }
}

const pool = new Pool({
  connectionString: withoutSslMode(connectionString),
  ssl: sslDisabled ? false : { rejectUnauthorized: false }, // needed for most free Postgres hosts (Neon, Render, etc.)
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

module.exports = pool;
