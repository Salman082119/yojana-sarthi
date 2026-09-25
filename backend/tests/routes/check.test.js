// routes/check.test.js
// Patches the shared pool instance + uses the real jsonwebtoken with a test secret.

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
const checkRouter = require("../../routes/check.js");

const schemes = [
  {
    id: "pmkisan",
    name: "PM Kisan",
    name_hi: "पीएम किसान",
    level: "central",
    state: null,
    ministry: "Agriculture",
    category: "Agriculture",
    description: "Income support",
    official_link: "https://pmkisan.gov.in",
    documents: [],
    steps: [],
    criteria: { minAge: 18, maxAge: 120, states: ["Uttar Pradesh"], maxIncome: 100000 },
  },
  {
    id: "senior",
    name: "Senior Pension",
    name_hi: "",
    level: "central",
    state: null,
    ministry: "Social Justice",
    category: "Pension",
    description: "Old age pension",
    official_link: "https://example.com",
    documents: [],
    steps: [],
    criteria: { minAge: 60 },
  },
];

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/check", checkRouter);
  return app;
}

describe("POST /api/check", () => {
  it("returns eligible matches for matching user", async () => {
    mockQuery.mockResolvedValue({ rows: schemes });
    const res = await request(makeApp())
      .post("/api/check")
      .send({ age: 65, state: "Uttar Pradesh", income: 80000, category: "general" });
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.matches).toBeDefined();
  });

  it("cleans invalid numeric inputs", async () => {
    mockQuery.mockResolvedValue({ rows: schemes });
    const res = await request(makeApp())
      .post("/api/check")
      .send({ age: 300, income: -5, state: "Uttar Pradesh" });
    expect(res.status).toBe(200);
  });

  it("returns no matches for ineligible user", async () => {
    mockQuery.mockResolvedValue({ rows: schemes });
    const res = await request(makeApp())
      .post("/api/check")
      .send({ age: 5, state: "Kerala", income: 5000000, category: "general" });
    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([]);
  });

  it("saves history for logged-in user", async () => {
    mockQuery.mockResolvedValueOnce({ rows: schemes }).mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(makeApp())
      .post("/api/check")
      .set("Authorization", `Bearer ${signToken(42)}`)
      .send({ age: 65, state: "Uttar Pradesh", income: 80000 });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][0]).toContain("INSERT INTO eligibility_checks");
  });

  it("does not save history for guests", async () => {
    mockQuery.mockResolvedValue({ rows: schemes });
    const res = await request(makeApp()).post("/api/check").send({ age: 65, state: "Uttar Pradesh" });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("returns 500 on db failure", async () => {
    mockQuery.mockRejectedValue(new Error("db down"));
    const res = await request(makeApp()).post("/api/check").send({ age: 30 });
    expect(res.status).toBe(500);
  });
});

describe("GET /api/check/history", () => {
  it("requires authentication", async () => {
    const res = await request(makeApp()).get("/api/check/history");
    expect(res.status).toBe(401);
  });

  it("returns history for authenticated user", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          input_data: { age: 30 },
          matched_scheme_ids: ["pmkisan"],
          created_at: "2026-01-01T10:00:00Z",
        },
      ],
    });
    const res = await request(makeApp())
      .get("/api/check/history")
      .set("Authorization", `Bearer ${signToken(42)}`);
    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
  });

  it("rejects invalid token", async () => {
    const res = await request(makeApp()).get("/api/check/history").set("Authorization", "Bearer bad-token");
    expect(res.status).toBe(401);
  });

  it("returns 500 on db failure", async () => {
    mockQuery.mockRejectedValue(new Error("db down"));
    const res = await request(makeApp())
      .get("/api/check/history")
      .set("Authorization", `Bearer ${signToken(42)}`);
    expect(res.status).toBe(500);
  });
});
