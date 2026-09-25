import { useEffect, useState } from "react";
import { getToken, getUser, setToken, setUser, clearToken, apiPost } from "../utils/api";

export function useAuth() {
  const [token, setTokenState] = useState(getToken() || null);
  const [user, setUserState] = useState(getUser());

  useEffect(() => {
    const handleStorageEvent = (e) => {
      if (e.key === "ys_token") {
        setTokenState(e.newValue || null);
      }
      if (e.key === "ys_user") {
        setUserState(e.newValue ? JSON.parse(e.newValue) : {});
      }
    };
    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, []);

  async function login(email, password) {
    const data = await apiPost("/api/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    setTokenState(data.token);
    setUserState(data.user);
    return data;
  }

  async function register(name, email, password) {
    const data = await apiPost("/api/auth/register", { name, email, password });
    setToken(data.token);
    setUser(data.user);
    setTokenState(data.token);
    setUserState(data.user);
    return data;
  }

  function logout() {
    clearToken();
    setTokenState(null);
    setUserState({});
  }

  const isAdmin = user?.role === "admin";

  return { token, user, isAdmin, login, register, logout };
}
