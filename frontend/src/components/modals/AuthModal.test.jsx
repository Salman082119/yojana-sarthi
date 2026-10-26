import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { apiPostMock } = vi.hoisted(() => ({ apiPostMock: vi.fn() }));

vi.mock("../../utils/api", () => ({ apiPost: apiPostMock }));

import AuthModal from "./AuthModal";

beforeEach(() => {
  apiPostMock.mockReset();
  window.history.replaceState(null, "", "/");
});

function setup(overrides = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onLogin: vi.fn().mockResolvedValue(undefined),
    onRegister: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<AuthModal {...props} />);
  return props;
}

describe("AuthModal", () => {
  it("submits login credentials", async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(props.onLogin).toHaveBeenCalledWith("test@example.com", "password123");
    expect(props.onClose).toHaveBeenCalled();
  });

  it("switches to register and submits the new account", async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByText("Don't have an account? Register"));
    await user.type(screen.getByPlaceholderText("Name"), "Test User");
    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password (min 8 chars)"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(props.onRegister).toHaveBeenCalledWith("Test User", "test@example.com", "password123");
  });

  it("shows a validation message when login fields are empty", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Email aur password daalein.")).toBeInTheDocument();
  });
});

describe("AuthModal email verification", () => {
  const token = "a".repeat(64);

  it("verifies the token from the URL hash and marks the stored user as verified", async () => {
    window.history.replaceState(null, "", `/#verify?token=${token}`);
    localStorage.setItem("ys_user", JSON.stringify({ id: 1, email_verified: false }));
    apiPostMock.mockResolvedValue({ ok: true });
    const verified = vi.fn();
    window.addEventListener("ys:email-verified", verified);

    setup();

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith("/api/auth/verify", { token }));
    expect(JSON.parse(localStorage.getItem("ys_user")).email_verified).toBe(true);
    expect(verified).toHaveBeenCalled();
    expect(window.location.hash).toBe("");
    expect(await screen.findByText("Email verify ho gaya. Ab login karein.")).toBeInTheDocument();

    window.removeEventListener("ys:email-verified", verified);
  });

  it("shows the server error when the verification link is invalid or expired", async () => {
    window.history.replaceState(null, "", `/#verify?token=${token}`);
    apiPostMock.mockRejectedValue(new Error("Invalid or expired verification link."));

    setup();

    expect(await screen.findByText("Invalid or expired verification link.")).toBeInTheDocument();
    expect(window.location.hash).toBe("");
  });
});
