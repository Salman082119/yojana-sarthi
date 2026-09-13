// routes/applications.js
// "My Applications" tracker — a logged-in user can save schemes they want to
// apply to and update the application status as they progress.

const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const VALID_STATUSES = ["saved", "applied", "documents_pending", "approved", "rejected"];

// GET /api/applications - list the user's tracked schemes (with scheme info)
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.scheme_id, a.status, a.notes, a.created_at, a.updated_at,
              s.name, s.name_hi, s.level, s.state, s.category, s.official_link
       FROM applications a
       JOIN schemes s ON s.id = a.scheme_id
       WHERE a.user_id = $1
       ORDER BY a.updated_at DESC`,
      [req.userId]
    );
    res.json({ applications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load your applications." });
  }
});

// POST /api/applications - upsert a saved scheme with a status
router.post("/", requireAuth, async (req, res) => {
  const { scheme_id, status, notes } = req.body;
  if (!scheme_id) return res.status(400).json({ error: "scheme_id is required." });
  const finalStatus = VALID_STATUSES.includes(status) ? status : "saved";

  try {
    const result = await pool.query(
      `INSERT INTO applications (user_id, scheme_id, status, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, scheme_id) DO UPDATE SET
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING id, scheme_id, status, notes`,
      [req.userId, scheme_id, finalStatus, notes || null]
    );
    res.status(201).json({ application: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save the application." });
  }
});

// PATCH /api/applications/:schemeId - update status / notes of a tracked scheme
router.patch("/:schemeId", requireAuth, async (req, res) => {
  const { status, notes } = req.body;
  const finalStatus = VALID_STATUSES.includes(status) ? status : null;

  try {
    const result = await pool.query(
      `UPDATE applications
       SET status = COALESCE($3, status),
           notes = $4,
           updated_at = NOW()
       WHERE user_id = $1 AND scheme_id = $2
       RETURNING id, scheme_id, status, notes`,
      [req.userId, req.params.schemeId, finalStatus, notes === undefined ? null : notes]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "This scheme is not in your applications." });
    }
    res.json({ application: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update the application." });
  }
});

// DELETE /api/applications/:schemeId - remove a tracked scheme
router.delete("/:schemeId", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM applications WHERE user_id = $1 AND scheme_id = $2",
      [req.userId, req.params.schemeId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not remove the application." });
  }
});

module.exports = router;