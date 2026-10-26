// routes/health.test.js
// Mocks the DB layer by patching the shared pool instance that the routes use,
// the same way the other route tests do.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const pool = require("../../db.js");
let mockQuery;

beforeEach(() => {
  mockQuery = vi.fn();
  pool.query = mockQuery;
});

import request from "supertest";
import express from "express";
const healthRouter = require("../../routes/health.js");

function makeApp() {
  const app = express();
  app.use(healthRouter);
  return app;
}

describe("GET /health", () => {
  it("reports ok without touching the database", async () => {
    const res = await request(makeApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("GET /ready", () => {
  it("reports ready when the database answers", async () => {
    mockQuery.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    const res = await request(makeApp()).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
    expect(mockQuery).toHaveBeenCalledWith("SELECT 1");
  });

  it("reports 503 without leaking the driver error", async () => {
    mockQuery.mockRejectedValue(new Error("The server does not support SSL connections"));
    const res = await request(makeApp()).get("/ready");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "unavailable" });
  });

  it("keeps /health green while /ready is red, which is the point", async () => {
    // The failure mode this endpoint exists to expose: a broken DATABASE_URL
    // used to yield a server that looked perfectly healthy to a probe.
    mockQuery.mockRejectedValue(new Error("db down"));
    const app = makeApp();
    expect((await request(app).get("/health")).status).toBe(200);
    expect((await request(app).get("/ready")).status).toBe(503);
  });
});
