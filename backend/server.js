// server.js - main entry point
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const schemesRoutes = require("./routes/schemes");
const checkRoutes = require("./routes/check");
const applicationsRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admin");
const seed = require("./seed");

const app = express();
const PORT = process.env.PORT || 3000;

// Behind a reverse proxy (Render/Railway/nginx) trust the first hop so
// req.ip and rate-limiting work correctly.
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/schemes", schemesRoutes);
app.use("/api/check", checkRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/admin", adminRoutes);

// Serve the frontend (static files) - the whole site is one deployable service
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Auto-seed schemes on startup so new/updated schemes are always in the DB
// without manually running `npm run seed`. Idempotent (upserts by id).
async function start() {
  try {
    await seed();
  } catch (err) {
    console.error("Auto-seed warning (continuing anyway):", err.message);
  }
  app.listen(PORT, () => {
    console.log(`Yojana Saarthi server running on port ${PORT}`);
  });
}

start();
