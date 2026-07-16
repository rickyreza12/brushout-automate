import { Activity, GitBranch, LogOut, Rocket } from "lucide-react";
import { api, clearToken } from "../api/client";

export function Shell({ children, onLogout }) {
  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Rocket size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-950">Brushout Automate</h1>
              <p className="text-sm text-slate-500">GitHub repo deployment dashboard</p>
            </div>
          </div>
          <button
            className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
            onClick={async () => {
              await api("/api/logout", { method: "POST", auth: false }).catch(() => undefined);
              clearToken();
              onLogout();
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

export function StatCard({ label, value, icon }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {icon || <Activity size={18} className="text-slate-400" />}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <GitBranch className="mx-auto text-slate-400" />
      <h3 className="mt-3 font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
