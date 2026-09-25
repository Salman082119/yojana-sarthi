// middleware/auth.test.js
// Uses the REAL jsonwebtoken + a test JWT_SECRET so the middleware's
// require("jsonwebtoken") resolves to the same cached module. No mocks needed.

import { describe, it, expect, vi } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

process.env.JWT_SECRET = "test-secret";

const jwt = require("jsonwebtoken");
const { requireAuth, optionalAuth } = require("../../middleware/auth.js");

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

function mockReq(header) {
  return { headers: { authorization: header } };
}

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
}

describe("requireAuth", () => {
  it("rejects when no Authorization header", () => {
    const next = vi.fn();
    requireAuth(mockReq(undefined), mockRes(), next);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects when header is not Bearer format", () => {
    const next = vi.fn();
    requireAuth(mockReq("Token abc"), mockRes(), next);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects when token is invalid", () => {
    const next = vi.fn();
    const res = mockRes();
    requireAuth(mockReq("Bearer not-a-real-token"), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("attaches userId and calls next for valid token", () => {
    const req = mockReq(`Bearer ${signToken(42)}`);
    const next = vi.fn();
    requireAuth(req, mockRes(), next);
    expect(req.userId).toBe(42);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("optionalAuth", () => {
  it("passes through without token", () => {
    const next = vi.fn();
    optionalAuth(mockReq(undefined), mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("attaches userId for valid token", () => {
    const req = mockReq(`Bearer ${signToken(7)}`);
    const next = vi.fn();
    optionalAuth(req, mockRes(), next);
    expect(req.userId).toBe(7);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("ignores invalid token but still calls next", () => {
    const req = mockReq("Bearer garbage-token");
    const next = vi.fn();
    optionalAuth(req, mockRes(), next);
    expect(req.userId).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
