import { useState } from "react";
import { api, setToken } from "../api/client";

export function LoginPage({ onLogin }) {
  const [token, setTokenValue] = useState("");
  const [error, setError] = useState("");

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
      </form>
    </main>
  );
}
