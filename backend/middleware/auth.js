// middleware/auth.js
// Verifies the JWT token sent in the Authorization header (Bearer <token>).
// Attaches req.userId if valid. Used to protect routes that need a logged-in user.

const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Login required. Please sign in first." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

// Optional auth: attaches req.userId if a valid token is present, but doesn't
// block the request if there isn't one. Useful for "check eligibility" which
// works for guests too, but saves history if logged in.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = payload.userId;
    } catch (err) {
      // ignore invalid token for optional auth
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
