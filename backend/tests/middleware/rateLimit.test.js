// middleware/rateLimit.test.js
// The limiter is disabled under NODE_ENV=test, so these tests stub the env and
// reload the module to exercise the real express-rate-limit middleware.

import { describe, it, expect, vi, afterEach } from "vitest";
import { createRequire } from "module";
import request from "supertest";
import express from "express";

const require = createRequire(import.meta.url);
const modulePath = require.resolve("../../middleware/rateLimit.js");

function loadLimiter() {
  delete require.cache[modulePath];
  return require(modulePath).makeLimiter;
}

function makeApp(limiter) {
  const app = express();
  app.use(limiter);
  app.get("/", (req, res) => res.json({ ok: true }));
  return app;
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete require.cache[modulePath];
});

describe("makeLimiter", () => {
  it("returns 429 with the configured message after the limit is reached", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_DISABLED", "");
    const makeLimiter = loadLimiter();
    const app = makeApp(makeLimiter({ windowMs: 60_000, limit: 2, message: "slow down" }));

    expect((await request(app).get("/")).status).toBe(200);
    expect((await request(app).get("/")).status).toBe(200);

    const blocked = await request(app).get("/");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: "slow down" });
    expect(blocked.headers["ratelimit-policy"]).toBeDefined();
  });

  it("is a no-op when RATE_LIMIT_DISABLED=1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_DISABLED", "1");
    const makeLimiter = loadLimiter();
    const app = makeApp(makeLimiter({ windowMs: 60_000, limit: 1, message: "slow down" }));

    for (let i = 0; i < 3; i++) {
      expect((await request(app).get("/")).status).toBe(200);
    }
  });
});
