// routes/admin.js
// Lightweight analytics dashboard for admin users: user counts, check activity,
// most-matched schemes and state-wise popularity.

const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

async function requireAdmin(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: "Login required." });
  try {
    const result = await pool.query("SELECT role FROM users WHERE id = $1", [req.userId]);
    if ((result.rows[0] || {}).role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not verify admin access." });
  }
}

// GET /api/admin/stats
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [users, checks, apps, schemes, trendResult, topResult, stateResult, catResult] =
      await Promise.all([
        pool.query("SELECT COUNT(*)::int AS total FROM users"),
        pool.query("SELECT COUNT(*)::int AS total FROM eligibility_checks"),
        pool.query("SELECT COUNT(*)::int AS total FROM applications"),
        pool.query("SELECT COUNT(*)::int AS total FROM schemes"),
        pool.query(
          `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
           FROM eligibility_checks
           WHERE created_at >= NOW() - INTERVAL '7 days'
           GROUP BY day ORDER BY day`
        ),
        pool.query(
          `SELECT m.id AS scheme_id, s.name, COUNT(*)::int AS n
           FROM eligibility_checks e
           CROSS JOIN LATERAL jsonb_array_elements_text(e.matched_scheme_ids) AS m(id)
           JOIN schemes s ON s.id = m.id
           GROUP BY m.id, s.name ORDER BY n DESC LIMIT 10`
        ),
        pool.query(
          `SELECT (e.input_data->>'state') AS state, COUNT(*)::int AS n
           FROM eligibility_checks e
           WHERE e.input_data->>'state' IS NOT NULL
           GROUP BY state ORDER BY n DESC LIMIT 10`
        ),
        pool.query(
          `SELECT (e.input_data->>'category') AS category, COUNT(*)::int AS n
           FROM eligibility_checks e
           WHERE e.input_data->>'category' IS NOT NULL
           GROUP BY category ORDER BY n DESC LIMIT 10`
        ),
      ]);

    res.json({
      users: users.rows[0].total,
      checks: checks.rows[0].total,
      applications: apps.rows[0].total,
      schemes: schemes.rows[0].total,
      trend: trendResult.rows,
      topSchemes: topResult.rows,
      topStates: stateResult.rows,
      topCategories: catResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load analytics." });
  }
});

module.exports = router;