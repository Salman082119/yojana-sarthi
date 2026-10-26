import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { apiPostMock } = vi.hoisted(() => ({ apiPostMock: vi.fn() }));

vi.mock("../utils/api", () => ({
  getToken: vi.fn(() => null),
  getUser: vi.fn(() => ({})),
  setToken: vi.fn(),
  setUser: vi.fn(),
  clearToken: vi.fn(),
  apiPost: apiPostMock,
}));

import * as api from "../utils/api";
import { useAuth } from "./useAuth";

const user = { id: 1, name: "Test", email: "test@example.com", role: "user", email_verified: false };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth", () => {
  it("logs in, stores the session and exposes the user", async () => {
    apiPostMock.mockResolvedValue({ token: "tok", user });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(apiPostMock).toHaveBeenCalledWith("/api/auth/login", {
      email: "test@example.com",
      password: "password123",
    });
    expect(api.setToken).toHaveBeenCalledWith("tok");
    expect(api.setUser).toHaveBeenCalledWith(user);
    expect(result.current.token).toBe("tok");
    expect(result.current.user.email).toBe("test@example.com");
    expect(result.current.isAdmin).toBe(false);
  });

  it("registers and exposes the new session", async () => {
    apiPostMock.mockResolvedValue({ token: "tok2", user: { ...user, id: 2 } });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.register("Test", "test@example.com", "password123");
    });

    expect(apiPostMock).toHaveBeenCalledWith("/api/auth/register", {
      name: "Test",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.current.token).toBe("tok2");
  });

  it("flags admin users", async () => {
    apiPostMock.mockResolvedValue({ token: "tok", user: { ...user, role: "admin" } });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login("admin@example.com", "password123");
    });

    expect(result.current.isAdmin).toBe(true);
  });

  it("logs out and clears the stored session", () => {
    const { result } = renderHook(() => useAuth());
    act(() => result.current.logout());

    expect(api.clearToken).toHaveBeenCalled();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toEqual({});
  });
});
