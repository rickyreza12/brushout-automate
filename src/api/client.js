const API_BASE = "";

export function getToken() {
  return localStorage.getItem("brushout_token");
}

export function setToken(token) {
  localStorage.setItem("brushout_token", token);
}

export function clearToken() {
  localStorage.removeItem("brushout_token");
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}
