// routes/check.js
// Core eligibility-matching engine. Reads all schemes + their JSON "criteria"
// from the database, evaluates each against the submitted answers, and
// returns the matching schemes. If the request is from a logged-in user
// (optionalAuth), the check is also saved to their history.

const express = require("express");
const pool = require("../db");
const { optionalAuth, requireAuth } = require("../middleware/auth");
const { evaluateAll } = require("../lib/eligibility");

const router = express.Router();

const cleanNum = (v) => (v === "" || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v));

// POST /api/check
router.post("/", optionalAuth, async (req, res) => {
  let age = req.body.age ?? null;
  let income = req.body.income ?? null;
  if (age === "" || age === undefined) age = null;
  if (income === "" || income === undefined) income = null;
  if (age !== null && (isNaN(Number(age)) || Number(age) < 0 || Number(age) > 120)) age = null;
  if (income !== null && (isNaN(Number(income)) || Number(income) < 0 || Number(income) > 1000000000))
    income = null;

  const u = {
    age: age === null ? null : Number(age),
    gender: req.body.gender ?? null,
    state: req.body.state ?? null,
    income: income === null ? null : Number(income),
    category: req.body.category ?? null,
    occupation: req.body.occupation ?? null,
    residence: req.body.residence ?? null,
    education: req.body.education ?? null,
    landSizeAcres: cleanNum(req.body.landSizeAcres),
    familySize: cleanNum(req.body.familySize),
    landOwner: !!req.body.landOwner,
    bpl: !!req.body.bpl,
    disability: !!req.body.disability,
    widow: !!req.body.widow,
    noPucca: !!req.body.noPucca,
  };

  try {
    const result = await pool.query("SELECT * FROM schemes");
    const { matches, nearMatches } = evaluateAll(result.rows, u);

    // Save to history if the user is logged in
    if (req.userId) {
      await pool.query(
        "INSERT INTO eligibility_checks (user_id, input_data, matched_scheme_ids) VALUES ($1, $2, $3)",
        [req.userId, JSON.stringify(u), JSON.stringify(matches.map((m) => m.id))]
      );
    }

    res.json({
      count: matches.length,
      matches,
      nearCount: nearMatches.length,
      nearMatches,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while checking eligibility." });
  }
});

// GET /api/check/history - past checks for the logged-in user
router.get("/history", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, input_data, matched_scheme_ids, created_at FROM eligibility_checks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [req.userId]
    );
    res.json({ history: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load your history." });
  }
});

module.exports = router;
