// routes/admin.test.js
// Patches the shared pool instance + real JWT with test secret.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

process.env.JWT_SECRET = "test-secret";

const pool = require("../../db.js");
const jwt = require("jsonwebtoken");
let mockQuery;
const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

beforeEach(() => {
  mockQuery = vi.fn();
  pool.query = mockQuery;
});

import request from "supertest";
import express from "express";
const adminRouter = require("../../routes/admin.js");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);
  return app;
}

describe("GET /api/admin/stats", () => {
  it("returns 401 without token", async () => {
    const res = await request(makeApp()).get("/api/admin/stats");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: "user" }] });
    const res = await request(makeApp())
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${signToken(5)}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Admin access required");
  });

  it("returns stats for admin users", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ role: "admin" }] })
      .mockResolvedValueOnce({ rows: [{ total: 5 }] })
      .mockResolvedValueOnce({ rows: [{ total: 12 }] })
      .mockResolvedValueOnce({ rows: [{ total: 3 }] })
      .mockResolvedValueOnce({ rows: [{ total: 64 }] })
      .mockResolvedValueOnce({ rows: [{ day: "2026-09-01", n: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: "pmkisan", name: "PM Kisan", n: 10 }] })
      .mockResolvedValueOnce({ rows: [{ state: "UP", n: 6 }] })
      .mockResolvedValueOnce({ rows: [{ category: "Agriculture", n: 4 }] });

    const res = await request(makeApp())
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${signToken(1)}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toBe(5);
    expect(res.body.checks).toBe(12);
    expect(res.body.schemes).toBe(64);
  });

  it("returns 500 when role query fails", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db down"));
    const res = await request(makeApp())
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${signToken(1)}`);
    expect(res.status).toBe(500);
  });
});
