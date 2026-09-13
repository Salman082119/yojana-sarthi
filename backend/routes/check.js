// routes/check.js
// Core eligibility-matching engine. Reads all schemes + their JSON "criteria"
// from the database, evaluates each against the submitted answers, and
// returns the matching schemes. If the request is from a logged-in user
// (optionalAuth), the check is also saved to their history.

const express = require("express");
const pool = require("../db");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

const MISSED_LABELS = {
  minAge: "minAge",
  maxAge: "maxAge",
  genders: "genders",
  states: "states",
  maxIncome: "maxIncome",
  categories: "categories",
  occupations: "occupations",
  landOwner: "requiresLandOwner",
  bpl: "requiresBPL",
  disability: "requiresDisability",
  widow: "requiresWidow",
  noPucca: "requiresNoPucca",
  residences: "residences",
  categoriesOrFemale: "categoriesOrFemale",
  bplOrCategories: "bplOrCategories",
  ageOrWidowOrDisability: "ageOrWidowOrDisability",
};

// Evaluates a scheme's "criteria" object against the submitted answers.
// Returns an array of missed conditions (empty array = fully eligible).
// Each entry: { code, label, value } so the frontend can explain WHY.
function evaluateCriteria(criteria, u) {
  const missed = [];
  if (criteria.minAge !== undefined && (u.age === null || u.age < criteria.minAge))
    missed.push({ code: "minAge", label: MISSED_LABELS.minAge, value: criteria.minAge });
  if (criteria.maxAge !== undefined && (u.age === null || u.age > criteria.maxAge))
    missed.push({ code: "maxAge", label: MISSED_LABELS.maxAge, value: criteria.maxAge });

  if (criteria.genders && !criteria.genders.includes(u.gender))
    missed.push({ code: "genders", label: MISSED_LABELS.genders, value: criteria.genders });

  if (criteria.states && !criteria.states.includes(u.state))
    missed.push({ code: "states", label: MISSED_LABELS.states, value: criteria.states });

  if (criteria.maxIncome !== undefined) {
    if (u.income === null || u.income === undefined || u.income > criteria.maxIncome)
      missed.push({ code: "maxIncome", label: MISSED_LABELS.maxIncome, value: criteria.maxIncome });
  }

  if (criteria.categories && !criteria.categories.includes(u.category))
    missed.push({ code: "categories", label: MISSED_LABELS.categories, value: criteria.categories });

  if (criteria.occupations && !criteria.occupations.includes(u.occupation))
    missed.push({ code: "occupations", label: MISSED_LABELS.occupations, value: criteria.occupations });

  if (criteria.residences && !criteria.residences.includes(u.residence))
    missed.push({ code: "residences", label: MISSED_LABELS.residences, value: criteria.residences });

  if (criteria.requiresLandOwner && !u.landOwner) missed.push({ code: "landOwner", label: MISSED_LABELS.landOwner });
  if (criteria.requiresBPL && !u.bpl) missed.push({ code: "bpl", label: MISSED_LABELS.bpl });
  if (criteria.requiresDisability && !u.disability) missed.push({ code: "disability", label: MISSED_LABELS.disability });
  if (criteria.requiresWidow && !u.widow) missed.push({ code: "widow", label: MISSED_LABELS.widow });
  if (criteria.requiresNoPucca && !u.noPucca) missed.push({ code: "noPucca", label: MISSED_LABELS.noPucca });

  if (criteria.categoriesOrFemale) {
    const catMatch = criteria.categoriesOrFemale.includes(u.category);
    if (!catMatch && u.gender !== "female")
      missed.push({ code: "categoriesOrFemale", label: MISSED_LABELS.categoriesOrFemale, value: criteria.categoriesOrFemale });
  }
  if (criteria.bplOrCategories) {
    const catMatch = criteria.bplOrCategories.includes(u.category);
    if (!u.bpl && !catMatch)
      missed.push({ code: "bplOrCategories", label: MISSED_LABELS.bplOrCategories, value: criteria.bplOrCategories });
  }
  if (criteria.ageOrWidowOrDisability !== undefined) {
    const ageOk = u.age !== null && u.age >= criteria.ageOrWidowOrDisability;
    if (!ageOk && !u.widow && !u.disability)
      missed.push({ code: "ageOrWidowOrDisability", label: MISSED_LABELS.ageOrWidowOrDisability, value: criteria.ageOrWidowOrDisability });
  }

  return missed;
}

// Special-case override for Ayushman Bharat style "income OR bpl" rule
function isEligibleSpecial(schemeId, criteria, u) {
  if (schemeId === "ayushman") {
    if (u.bpl) return { eligible: true, missed: [] };
    if (criteria.maxIncome !== undefined && u.income !== null && u.income !== undefined) {
      return u.income <= criteria.maxIncome
        ? { eligible: true, missed: [] }
        : { eligible: false, missed: [{ code: "maxIncome", label: "maxIncome", value: criteria.maxIncome }] };
    }
    return { eligible: false, missed: [{ code: "bpl", label: "requiresBPL" }] };
  }
  const missed = evaluateCriteria(criteria, u);
  return { eligible: missed.length === 0, missed };
}

// POST /api/check
router.post("/", optionalAuth, async (req, res) => {
  let age = req.body.age ?? null;
  let income = req.body.income ?? null;
  if (age === "" || age === undefined) age = null;
  if (income === "" || income === undefined) income = null;
  if (age !== null && (isNaN(Number(age)) || Number(age) < 0 || Number(age) > 120)) age = null;
  if (income !== null && (isNaN(Number(income)) || Number(income) < 0 || Number(income) > 1000000000)) income = null;

  const u = {
    age: age === null ? null : Number(age),
    gender: req.body.gender ?? null,
    state: req.body.state ?? null,
    income: income === null ? null : Number(income),
    category: req.body.category ?? null,
    occupation: req.body.occupation ?? null,
    residence: req.body.residence ?? null,
    landOwner: !!req.body.landOwner,
    bpl: !!req.body.bpl,
    disability: !!req.body.disability,
    widow: !!req.body.widow,
    noPucca: !!req.body.noPucca,
  };

  try {
    const result = await pool.query("SELECT * FROM schemes");
    const evaluated = result.rows.map((s) => ({
      ...s,
      ...isEligibleSpecial(s.id, s.criteria, u),
    }));

    const matches = evaluated.filter((s) => s.eligible).map(({ eligible, missed, ...rest }) => rest);
    const nearMatches = evaluated
      .filter((s) => !s.eligible && s.missed.length > 0 && s.missed.length <= 2)
      .map(({ eligible, ...rest }) => rest);

    // Save to history if the user is logged in
    if (req.userId) {
      await pool.query(
        "INSERT INTO eligibility_checks (user_id, input_data, matched_scheme_ids) VALUES ($1, $2, $3)",
        [req.userId, JSON.stringify(u), JSON.stringify(matches.map((m) => m.id))]
      );
    }

    res.json({ count: matches.length, matches, nearCount: nearMatches.length, nearMatches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while checking eligibility." });
  }
});

// GET /api/check/history - past checks for the logged-in user
const { requireAuth } = require("../middleware/auth");
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
