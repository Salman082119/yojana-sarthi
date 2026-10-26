// middleware/rateLimit.js
// Shared rate-limiter factory. Tests disable every limiter, both explicitly
// (RATE_LIMIT_DISABLED=1, used by the auth tests) and automatically under
// Vitest so a suite cannot trip a production-sized window.

const rateLimit = require("express-rate-limit");

const disabled = process.env.RATE_LIMIT_DISABLED === "1" || process.env.NODE_ENV === "test";

function makeLimiter({ windowMs, limit, message }) {
  if (disabled) return (req, res, next) => next();

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });
}

module.exports = { makeLimiter };
