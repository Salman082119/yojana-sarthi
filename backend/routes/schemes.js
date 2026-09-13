// routes/schemes.js
const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/schemes - list all schemes (used by the frontend to show totals, browse, etc.)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, name_hi, level, state, ministry, category, description, official_link FROM schemes ORDER BY level, category, name"
    );
    res.json({ schemes: result.rows, total: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load schemes from the database." });
  }
});

module.exports = router;
