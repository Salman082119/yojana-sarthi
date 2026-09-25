import { useEffect, useState } from "react";
import { apiPost } from "../../utils/api";
import "../../styles/modals.css";

const RESET_PREFIX = "#reset?";
const VERIFY_PREFIX = "#verify?";

// The email links deep-link into this modal via the URL hash, so the view is
// decided once at mount instead of being pushed into state from an effect.
function readHashRoute() {
  const h = window.location.hash || "";
  if (h.startsWith(RESET_PREFIX)) {
    const token = new URLSearchParams(h.slice(RESET_PREFIX.length)).get("token");
    return { mode: token ? "reset" : "register", forgotView: true };
  }
  return { mode: "login", forgotView: false };
}

export default function AuthModal({ isOpen, onClose, onLogin, onRegister }) {
  const [route] = useState(readHashRoute);
  const [mode, setMode] = useState(route.mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", success: false });
  const [forgotView, setForgotView] = useState(route.forgotView);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

  // Confirming an emailed link is a side effect on the outside world, so it
  // stays in an effect. The hash is always cleared afterwards, otherwise a
  // reload would re-post the same one-shot token.
  useEffect(() => {
    const h = window.location.hash || "";
    if (!h.startsWith(VERIFY_PREFIX)) return;
    const token = new URLSearchParams(h.slice(VERIFY_PREFIX.length)).get("token");
    apiPost("/api/auth/verify", { token })
      .catch(() => {})
      .finally(() => {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash || "";
      if (h.startsWith(RESET_PREFIX)) {
        setMode("reset");
        setForgotView(true);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function resetViews() {
    setMode("login");
    setForgotView(false);
    setMessage({ text: "", success: false });
    setForgotMessage("");
    setForgotEmail("");
    setName("");
    setEmail("");
    setPassword("");
  }

  function handleClose() {
    resetViews();
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ text: "", success: false });
    if (mode === "login") {
      if (!email || !password) {
        setMessage({ text: "Email aur password daalein.", success: false });
        return;
      }
      try {
        await onLogin(email, password);
        handleClose();
      } catch (err) {
        setMessage({ text: err.message, success: false });
      }
    } else if (mode === "register") {
      if (!name || !email || !password) {
        setMessage({ text: "Name, email aur password teeno required hain.", success: false });
        return;
      }
      try {
        await onRegister(name, email, password);
        handleClose();
      } catch (err) {
        setMessage({ text: err.message, success: false });
      }
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotMessage("Email daalein / Enter your email.");
      return;
    }
    setForgotMessage("भेजा जा रहा है… Sending…");
    try {
      await apiPost("/api/auth/forgot", { email: forgotEmail });
      setForgotMessage(
        "Reset link bhej diya gaya (agar account hai to). / If the account exists, a reset link has been sent."
      );
    } catch (err) {
      setForgotMessage(err.message);
    }
  }

  async function handleReset(token) {
    const resp = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setMessage({ text: data.error || "Reset nahi hua.", success: false });
      return;
    }
    setMessage({
      text: "Password update ho gaya — ab login karein. / Password updated — please log in.",
      success: true,
    });
    setTimeout(() => {
      setMode("login");
      setPassword("");
      setForgotView(false);
      resetViews();
      onClose();
    }, 2000);
  }

  function toggleMode() {
    setMode(mode === "login" ? "register" : "login");
    setMessage({ text: "", success: false });
  }

  return (
    <div className={`modal-backdrop${isOpen ? " open" : ""}`}>
      <div className="modal">
        <span className="close" onClick={handleClose}>
          &times;
        </span>

        {mode === "reset" ? (
          <>
            <h3>Set New Password</h3>
            <input
              type="password"
              id="newPass"
              placeholder="New password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className={`msg${message.success ? " success" : ""}`}>{message.text}</div>
            <button
              className="primary"
              onClick={() => {
                const h = window.location.hash || "";
                const params = new URLSearchParams(h.slice("#reset?".length));
                handleReset(params.get("token"));
              }}
            >
              Set password
            </button>
            <div
              className="switch"
              onClick={() => {
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
                setMode("login");
                setForgotView(false);
              }}
            >
              ← Back to Login
            </div>
          </>
        ) : forgotView ? (
          <>
            <h3>Forgot Password</h3>
            <form onSubmit={handleForgot}>
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
              <div className="msg">{forgotMessage}</div>
              <button className="primary" type="submit">
                Send reset link
              </button>
            </form>
            <div
              className="switch"
              onClick={() => {
                if (window.location.hash) {
                  window.history.replaceState(null, "", window.location.pathname + window.location.search);
                }
                setForgotView(false);
              }}
            >
              ← Back to Login
            </div>
          </>
        ) : (
          <>
            <h3>{mode === "login" ? "Login" : "Register"}</h3>
            <form onSubmit={handleSubmit}>
              {mode === "register" && (
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className={`msg${message.success ? " success" : ""}`}>{message.text}</div>
              <button className="primary" type="submit">
                {mode === "login" ? "Login" : "Register"}
              </button>
            </form>
            {mode === "login" && (
              <div className="forgot-link" onClick={() => setForgotView(true)}>
                Forgot password?
              </div>
            )}
            <div className="switch" onClick={toggleMode}>
              {mode === "login" ? "Don't have an account? Register" : "Already have an account? Login"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
