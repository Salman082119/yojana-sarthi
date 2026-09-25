const TOKEN_KEY = "ys_token";
const USER_KEY = "ys_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAuthHeaders(extra = {}) {
  const token = getToken();
  const headers = { ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function apiGet(url) {
  const res = await fetch(url, { headers: getAuthHeaders() });
  return handleResponse(res);
}

export async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiPatch(url, body) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiDelete(url) {
  const res = await fetch(url, { method: "DELETE", headers: getAuthHeaders() });
  return handleResponse(res);
}
