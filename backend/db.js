// db.js - PostgreSQL connection pool
// Uses the DATABASE_URL environment variable (set this in your .env file
// locally, or in your hosting provider's environment variables when deployed).

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false }, // needed for most free Postgres hosts (Neon, Render, etc.)
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

module.exports = pool;
