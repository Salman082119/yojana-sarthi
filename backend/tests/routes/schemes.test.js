// routes/schemes.test.js
// Mocks the DB layer by patching the shared pool instance that routes use.

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
const schemesRouter = require("../../routes/schemes.js");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/schemes", schemesRouter);
  return app;
}

describe("GET /api/schemes", () => {
  it("returns schemes and total count", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: "pmkisan", name: "PM Kisan", level: "central" }],
    });
    const res = await request(makeApp()).get("/api/schemes");
    expect(res.status).toBe(200);
    expect(res.body.schemes).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("returns empty list", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(makeApp()).get("/api/schemes");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it("returns 500 on db error", async () => {
    mockQuery.mockRejectedValue(new Error("db down"));
    const res = await request(makeApp()).get("/api/schemes");
    expect(res.status).toBe(500);
  });
});
