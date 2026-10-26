// server.js - main entry point
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");

const authRoutes = require("./routes/auth");
const schemesRoutes = require("./routes/schemes");
const checkRoutes = require("./routes/check");
const applicationsRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admin");
const healthRoutes = require("./routes/health");
const seed = require("./seed");
const pool = require("./db");
const { makeLimiter } = require("./middleware/rateLimit");

const app = express();
const PORT = process.env.PORT || 3000;

// Behind a reverse proxy (Render/Railway/nginx) trust the first hop so
// req.ip and rate-limiting work correctly.
app.set("trust proxy", 1);

// Security headers (helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS is limited to the app's own origin plus any extra origins configured in
// CORS_ORIGINS. Requests without an Origin header (same-origin navigations,
// curl, server-to-server) are allowed. In development the Vite dev server is
// added so `npm run dev:client` can talk to the API.
const allowedOrigins = (() => {
  const origins = new Set();
  const add = (value) => {
    if (!value) return;
    try {
      origins.add(new URL(value).origin);
    } catch {
      console.warn(`Ignoring malformed origin in CORS config: ${value}`);
    }
  };

  add(process.env.APP_URL);
  (process.env.CORS_ORIGINS || "").split(",").forEach((origin) => add(origin.trim()));
  if (process.env.NODE_ENV !== "production") {
    ["http://localhost:5173", "http://localhost:3000"].forEach(add);
  }

  return origins;
})();

app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
  })
);
app.use(express.json({ limit: "10kb" }));

// Coarse API-wide ceiling; the auth and check routes add tighter limits.
const apiLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: "Too many requests. Please slow down and try again shortly.",
});
app.use("/api", apiLimiter);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/schemes", schemesRoutes);
app.use("/api/check", checkRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/admin", adminRoutes);

// Any /api path that didn't match a route above is a real 404. Answer with
// JSON so a client never receives the HTML shell for an API call.
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Liveness and readiness probes
app.use(healthRoutes);

// The frontend is a separate Vite app. It must be built (`npm run build` from
// the repo root) before the server can serve it; there is no legacy fallback.
const staticDir = path.join(__dirname, "..", "frontend", "dist");
const hasBuild = (() => {
  try {
    return fs.statSync(path.join(staticDir, "index.html")).isFile();
  } catch {
    return false;
  }
})();

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

app.use(
  express.static(staticDir, {
    // index.html is served explicitly below so we control its cache headers.
    index: false,
    setHeaders(res, filePath) {
      const name = path.basename(filePath);
      if (name === "index.html" || name === "sw.js") {
        // Must revalidate, otherwise a deploy leaves browsers pinned to a
        // shell that points at asset filenames that no longer exist.
        res.setHeader("Cache-Control", "no-cache");
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        // Vite fingerprints these filenames, so they are safe to cache forever.
        res.setHeader("Cache-Control", `public, max-age=${ONE_YEAR_SECONDS}, immutable`);
      }
    },
  })
);

app.get("/", (req, res, next) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(staticDir, "index.html"), (err) => err && next(err));
});

// SPA fallback: hand navigation requests back to the shell. Paths that look
// like files (missing images, bad asset URLs) still 404 rather than silently
// returning HTML.
app.get("*", (req, res, next) => {
  if (path.extname(req.path)) return next();
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(staticDir, "index.html"), (err) => err && next(err));
});

// One-shot tokens are useless once expired or used; keeping them around only
// grows the table. A week of grace is plenty for debugging a support case.
async function cleanupTokens() {
  try {
    await pool.query(
      `DELETE FROM tokens
       WHERE expires_at < NOW() - INTERVAL '7 days'
          OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days')`
    );
  } catch (err) {
    // Never let housekeeping stop the server from booting.
    console.error("Token cleanup warning:", err.message);
  }
}

// Auto-seed schemes on startup so new/updated schemes are always in the DB
// without manually running `npm run seed`. Idempotent (upserts by id).
async function start() {
  try {
    await seed();
  } catch (err) {
    console.error("Auto-seed warning (continuing anyway):", err.message);
  }

  await cleanupTokens();
  setInterval(cleanupTokens, 24 * 60 * 60 * 1000).unref();

  app.listen(PORT, () => {
    console.log(`Yojana Saarthi server running on port ${PORT}`);
    if (hasBuild) {
      console.log(`Serving frontend from: ${staticDir}`);
    } else {
      // The API still works, so keep serving rather than crash-looping.
      console.error(`Frontend build missing at ${staticDir} — the API will work but no page will load.`);
      console.error("Run `npm run build` from the repo root (CI, Render and Docker all do this for you).");
    }
  });
}

start();
