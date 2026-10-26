import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getToken,
  setToken,
  getUser,
  setUser,
  clearToken,
  getAuthHeaders,
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from "./api";

describe("token/user storage", () => {
  it("stores and returns the token", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
  });

  it("stores and returns the user", () => {
    setUser({ id: 1, email: "a@b.com" });
    expect(getUser()).toEqual({ id: 1, email: "a@b.com" });
  });

  it("returns an empty object when stored user JSON is malformed", () => {
    localStorage.setItem("ys_user", "{not-json");
    expect(getUser()).toEqual({});
  });

  it("clears both token and user", () => {
    setToken("abc123");
    setUser({ id: 1 });
    clearToken();
    expect(getToken()).toBeNull();
    expect(getUser()).toEqual({});
  });

  it("adds a bearer header only when a token exists", () => {
    expect(getAuthHeaders({ "X-Test": "1" })).toEqual({ "X-Test": "1" });
    setToken("abc123");
    expect(getAuthHeaders({ "X-Test": "1" })).toEqual({
      "X-Test": "1",
      Authorization: "Bearer abc123",
    });
  });
});

describe("fetch wrapper", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });
  const errorResponse = (status, body) => ({ ok: false, status, json: async () => body });

  it("returns parsed JSON on success", async () => {
    fetch.mockResolvedValue(okResponse({ schemes: [] }));
    await expect(apiGet("/api/schemes")).resolves.toEqual({ schemes: [] });
  });

  it("sends JSON bodies with the right method and headers", async () => {
    setToken("tok");
    fetch.mockResolvedValue(okResponse({ ok: true }));

    await apiPost("/api/check", { age: 30 });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("/api/check");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer tok",
    });
    expect(JSON.parse(options.body)).toEqual({ age: 30 });
  });

  it("uses PATCH and DELETE for their helpers", async () => {
    fetch.mockResolvedValue(okResponse({ ok: true }));
    await apiPatch("/api/applications/x", { status: "applied" });
    await apiDelete("/api/applications/x");

    expect(fetch.mock.calls[0][1].method).toBe("PATCH");
    expect(fetch.mock.calls[1][1].method).toBe("DELETE");
  });

  it("throws the server error message", async () => {
    fetch.mockResolvedValue(errorResponse(400, { error: "Bad input" }));
    await expect(apiGet("/api/check")).rejects.toThrow("Bad input");
  });

  it("falls back to a status message when the body is not JSON", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    });
    await expect(apiGet("/api/check")).rejects.toThrow("Request failed (500)");
  });
});
