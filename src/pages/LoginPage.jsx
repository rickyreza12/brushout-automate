import { useEffect, useState } from "react";
import { api, setToken } from "../api/client";

export function LoginPage({ onLogin }) {
  const [token, setTokenValue] = useState("");
  const [error, setError] = useState("");
  const [githubEnabled, setGithubEnabled] = useState(false);

  useEffect(() => {
    api("/api/session", { auth: false })
      .then((data) => {
        if (data.authenticated) onLogin();
      })
      .catch(() => undefined);
    api("/api/auth/github/enabled", { auth: false })
      .then((data) => setGithubEnabled(data.enabled))
      .catch(() => undefined);
  }, [onLogin]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ token })
      });
      setToken(data.token);
      onLogin();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4">
      <form className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm" onSubmit={submit}>
        <h1 className="text-2xl font-semibold text-slate-950">Brushout Automate</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your admin token.</p>
        <label className="mt-6 block">
          <span className="text-sm font-medium text-slate-700">Admin token</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
            type="password"
            value={token}
            onChange={(event) => setTokenValue(event.target.value)}
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button className="mt-5 w-full rounded-md bg-slate-950 px-4 py-2 text-white">Login</button>
        <a
          className={`mt-3 block w-full rounded-md border border-slate-300 px-4 py-2 text-center text-slate-800 ${githubEnabled ? "" : "pointer-events-none opacity-50"}`}
          href="/api/auth/github/start"
        >
          Login with GitHub
        </a>
        {!githubEnabled && (
          <p className="mt-2 text-xs text-slate-500">
            Configure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to enable GitHub login.
          </p>
        )}
      </form>
    </main>
  );
}
