// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const pool = require("../db");
const { sendPasswordReset, sendVerifyEmail } = require("../mailer");

const router = express.Router();

// Slow down repeated login/register attempts (basic brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait 15 minutes and try again." },
});

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Whether a user should be an admin comes from the ADMIN_EMAILS env var.
function adminIfConfigured(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "user";
}

function signToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function validTokenPair(token) {
  return /^[a-f0-9]{64}$/.test(token);
}

async function createToken(userId, purpose, hoursTillExpiry = 24) {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  await pool.query(
    "INSERT INTO tokens (user_id, purpose, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + ($4 || ' hours')::interval)",
    [userId, purpose, hash, hoursTillExpiry]
  );
  return raw;
}

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are all required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, email_verified",
      [name, email.toLowerCase(), passwordHash, adminIfConfigured(email)]
    );

    const user = result.rows[0];
    const token = signToken(user);

    // Send a verification email (dev mode logs the link to console).
    const vtoken = await createToken(user.id, "email_verify");
    sendVerifyEmail(user.email, vtoken).catch((e) => console.error("Verify email failed:", e.message));

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while creating your account." });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Keep role in sync if this email was later added to ADMIN_EMAILS.
    if (user.role !== "admin" && adminIfConfigured(user.email) === "admin") {
      await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
      user.role = "admin";
    }

    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while logging in." });
  }
});

// POST /api/auth/forgot - request a password reset link
router.post("/forgot", authLimiter, async (req, res) => {
  const email = (req.body.email || "").toLowerCase();
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      // Don't reveal whether an account exists.
      return res.json({ ok: true });
    }
    const token = await createToken(result.rows[0].id, "password_reset");
    await sendPasswordReset(email, token);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// POST /api/auth/reset - set a new password using a reset token
router.post("/reset", authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !validTokenPair(token)) return res.status(400).json({ error: "Invalid or expired reset link." });
  if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

  try {
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const result = await pool.query(
      `SELECT * FROM tokens
       WHERE purpose = 'password_reset' AND token_hash = $1
         AND used_at IS NULL AND expires_at > NOW()`,
      [hash]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, result.rows[0].user_id]);
    await pool.query("UPDATE tokens SET used_at = NOW() WHERE id = $1", [result.rows[0].id]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while resetting your password." });
  }
});

// POST /api/auth/verify - confirm email address with a verification token
router.post("/verify", async (req, res) => {
  const token = (req.body.token || "").trim();
  if (!token || !validTokenPair(token)) return res.status(400).json({ error: "Invalid or expired verification link." });

  try {
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const result = await pool.query(
      `SELECT * FROM tokens
       WHERE purpose = 'email_verify' AND token_hash = $1
         AND used_at IS NULL AND expires_at > NOW()`,
      [hash]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired verification link." });
    }

    await pool.query("UPDATE users SET email_verified = TRUE WHERE id = $1", [result.rows[0].user_id]);
    await pool.query("UPDATE tokens SET used_at = NOW() WHERE id = $1", [result.rows[0].id]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while verifying your email." });
  }
});

module.exports = router;
