// routes/health.js
// Liveness and readiness probes.

const express = require("express");
const pool = require("../db");

const router = express.Router();

// Liveness only proves the process is up. Seed failures are logged and swallowed
// so one bad scheme cannot keep the API offline, which means a wrong
// DATABASE_URL still produces a server that answers /health while every real
// route fails. Do not use this as a deploy gate.
router.get("/health", (req, res) => res.json({ status: "ok" }));

// Readiness actually talks to the database, so it reports 503 until the app can
// really serve. This is the endpoint an orchestrator or deploy gate should
// watch, and it is what the Docker HEALTHCHECK and Render blueprint point at.
router.get("/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ready" });
  } catch (err) {
    res.status(503).json({ status: "unavailable", error: err.message });
  }
});

module.exports = router;
