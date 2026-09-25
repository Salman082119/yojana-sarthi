// routes/auth.test.js
// Patches the shared pool instance, uses REAL bcryptjs + jsonwebtoken.
// Rate limiter is disabled via RATE_LIMIT_DISABLED=1 (checked at module load).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

process.env.RATE_LIMIT_DISABLED = "1";
process.env.JWT_SECRET = "test-secret";
process.env.ADMIN_EMAILS = "";

const pool = require("../../db.js");
let mockQuery;

beforeEach(() => {
  mockQuery = vi.fn();
  pool.query = mockQuery;
});

import request from "supertest";
import express from "express";
import bcrypt from "bcryptjs";
const authRouter = require("../../routes/auth.js");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  return app;
}

const hashPassword = (pw) => bcrypt.hashSync(pw, 4);

describe("POST /api/auth/register", () => {
  it("registers a new user successfully", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: "Test", email: "test@example.com", role: "user", email_verified: false }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 10 }] });

    const res = await request(makeApp())
      .post("/api/auth/register")
      .send({ name: "Test User", email: "test@example.com", password: "secret123" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });

  it("rejects missing fields", async () => {
    const res = await request(makeApp())
      .post("/api/auth/register")
      .send({ name: "", email: "", password: "" });
    expect(res.status).toBe(400);
  });

  it("rejects short name", async () => {
    const res = await request(makeApp())
      .post("/api/auth/register")
      .send({ name: "A", email: "a@b.com", password: "secret123" });
    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    const res = await request(makeApp())
      .post("/api/auth/register")
      .send({ name: "Test", email: "test@example.com", password: "123" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid email format", async () => {
    const res = await request(makeApp())
      .post("/api/auth/register")
      .send({ name: "Test", email: "not-an-email", password: "secret123" });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(makeApp())
      .post("/api/auth/register")
      .send({ name: "Test", email: "dup@example.com", password: "secret123" });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          name: "Test",
          email: "test@example.com",
          role: "user",
          password_hash: hashPassword("correct-password"),
        },
      ],
    });

    const res = await request(makeApp())
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("rejects wrong password", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          name: "Test",
          email: "test@example.com",
          role: "user",
          password_hash: hashPassword("right-password"),
        },
      ],
    });

    const res = await request(makeApp())
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  it("rejects non-existent email", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(makeApp())
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "whatever123" });
    expect(res.status).toBe(401);
  });

  it("rejects missing fields", async () => {
    const res = await request(makeApp()).post("/api/auth/login").send({ email: "", password: "" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/forgot", () => {
  it("returns ok for non-existent email without revealing account", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(makeApp()).post("/api/auth/forgot").send({ email: "unknown@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("creates token and sends email for existing user", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: [{ id: 5 }] });

    const res = await request(makeApp()).post("/api/auth/forgot").send({ email: "existing@example.com" });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

describe("POST /api/auth/reset", () => {
  it("rejects invalid token format", async () => {
    const res = await request(makeApp())
      .post("/api/auth/reset")
      .send({ token: "short", password: "newpass123" });
    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    const res = await request(makeApp())
      .post("/api/auth/reset")
      .send({ token: "a".repeat(64), password: "123" });
    expect(res.status).toBe(400);
  });

  it("resets password with valid token", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 9, user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(makeApp())
      .post("/api/auth/reset")
      .send({ token: "a".repeat(64), password: "newpass123" });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][0]).toContain("UPDATE users SET password_hash");
  });

  it("rejects invalid or expired token", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(makeApp())
      .post("/api/auth/reset")
      .send({ token: "b".repeat(64), password: "newpass123" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/verify", () => {
  it("rejects invalid token format", async () => {
    const res = await request(makeApp()).post("/api/auth/verify").send({ token: "bad" });
    expect(res.status).toBe(400);
  });

  it("verifies email with valid token", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 3, user_id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(makeApp())
      .post("/api/auth/verify")
      .send({ token: "c".repeat(64) });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][0]).toContain("UPDATE users SET email_verified");
  });
});
