// routes/applications.test.js
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
const applicationsRouter = require("../../routes/applications.js");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/applications", applicationsRouter);
  return app;
}

describe("applications routes", () => {
  describe("GET /api/applications", () => {
    it("requires authentication", async () => {
      const res = await request(makeApp()).get("/api/applications");
      expect(res.status).toBe(401);
    });

    it("returns applications for authenticated user", async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            scheme_id: "pmkisan",
            status: "saved",
            name: "PM Kisan",
            name_hi: "",
            level: "central",
            category: "Agriculture",
          },
        ],
      });
      const res = await request(makeApp())
        .get("/api/applications")
        .set("Authorization", `Bearer ${signToken(42)}`);
      expect(res.status).toBe(200);
      expect(res.body.applications).toHaveLength(1);
      expect(res.body.applications[0].scheme_id).toBe("pmkisan");
    });

    it("returns empty list when no applications", async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const res = await request(makeApp())
        .get("/api/applications")
        .set("Authorization", `Bearer ${signToken(42)}`);
      expect(res.status).toBe(200);
      expect(res.body.applications).toHaveLength(0);
    });
  });

  describe("POST /api/applications", () => {
    it("requires authentication", async () => {
      const res = await request(makeApp())
        .post("/api/applications")
        .send({ scheme_id: "pmkisan", status: "saved" });
      expect(res.status).toBe(401);
    });

    it("creates a new tracked application", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1, scheme_id: "pmkisan", status: "saved", notes: null }] });
      const res = await request(makeApp())
        .post("/api/applications")
        .set("Authorization", `Bearer ${signToken(42)}`)
        .send({ scheme_id: "pmkisan", status: "saved" });
      expect(res.status).toBe(201);
      expect(mockQuery.mock.calls[0][0]).toContain("INSERT INTO applications");
    });

    it("rejects missing scheme_id", async () => {
      const res = await request(makeApp())
        .post("/api/applications")
        .set("Authorization", `Bearer ${signToken(42)}`)
        .send({ status: "saved" });
      expect(res.status).toBe(400);
    });

    it("defaults invalid status to 'saved'", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1, scheme_id: "pmkisan", status: "saved", notes: null }] });
      const res = await request(makeApp())
        .post("/api/applications")
        .set("Authorization", `Bearer ${signToken(42)}`)
        .send({ scheme_id: "pmkisan", status: "not-a-real-status" });
      expect(res.status).toBe(201);
      expect(res.body.application.status).toBe("saved");
    });

    it("upserts on duplicate (ON CONFLICT)", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1, scheme_id: "pmkisan", status: "applied", notes: "" }] });
      const res = await request(makeApp())
        .post("/api/applications")
        .set("Authorization", `Bearer ${signToken(42)}`)
        .send({ scheme_id: "pmkisan", status: "applied" });
      expect(res.status).toBe(201);
      expect(mockQuery.mock.calls[0][0]).toContain("ON CONFLICT");
    });
  });

  describe("PATCH /api/applications/:schemeId", () => {
    it("requires authentication", async () => {
      const res = await request(makeApp()).patch("/api/applications/pmkisan").send({ status: "applied" });
      expect(res.status).toBe(401);
    });

    it("updates application status", async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, scheme_id: "pmkisan", status: "applied", notes: null }],
      });
      const res = await request(makeApp())
        .patch("/api/applications/pmkisan")
        .set("Authorization", `Bearer ${signToken(42)}`)
        .send({ status: "applied" });
      expect(res.status).toBe(200);
      expect(res.body.application.status).toBe("applied");
      expect(mockQuery.mock.calls[0][0]).toContain("UPDATE applications");
    });

    it("returns 404 when scheme is not tracked", async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const res = await request(makeApp())
        .patch("/api/applications/pmkisan")
        .set("Authorization", `Bearer ${signToken(42)}`)
        .send({ status: "applied" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/applications/:schemeId", () => {
    it("requires authentication", async () => {
      const res = await request(makeApp()).delete("/api/applications/pmkisan");
      expect(res.status).toBe(401);
    });

    it("deletes a tracked application", async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const res = await request(makeApp())
        .delete("/api/applications/pmkisan")
        .set("Authorization", `Bearer ${signToken(42)}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(mockQuery.mock.calls[0][0]).toContain("DELETE FROM applications");
    });
  });
});
