import { useEffect, useMemo, useState } from "react";
import { Clock, Github, Rocket, Server } from "lucide-react";
import { api } from "../api/client";
import { EmptyState, Shell, StatCard } from "../components/Shell";

const defaultForm = {
  name: "",
  repoUrl: "",
  branch: "main",
  appType: "node",
  buildCommand: "npm ci && npm run build",
  startCommand: "npm run start",
  domain: "",
  port: "",
  healthUrl: ""
};

export function Dashboard({ onLogout }) {
  const [projects, setProjects] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [repos, setRepos] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [selectedLog, setSelectedLog] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => ({
    projects: projects.length,
    deployments: deployments.length,
    success: deployments.filter((item) => item.status === "success").length,
    running: deployments.filter((item) => item.status === "running").length
  }), [projects, deployments]);

  async function load() {
    const [projectData, deploymentData, repoData] = await Promise.all([
      api("/api/projects"),
      api("/api/deployments"),
      api("/api/github/repos")
    ]);
    setProjects(projectData.projects);
    setDeployments(deploymentData.deployments);
    setRepos(repoData.repos);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    const timer = setInterval(() => load().catch(() => undefined), 4000);
    return () => clearInterval(timer);
  }, []);

  async function createProject(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/projects", { method: "POST", body: JSON.stringify(form) });
      setForm(defaultForm);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deploy(projectId) {
    await api(`/api/projects/${projectId}/deploy`, { method: "POST" });
    await load();
  }

  async function viewLogs(deploymentId) {
    const logs = await api(`/api/deployments/${deploymentId}/logs`, {
      headers: { Accept: "text/plain" }
    });
    setSelectedLog(logs);
  }

  return (
    <Shell onLogout={onLogout}>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Projects" value={stats.projects} icon={<Server size={18} className="text-slate-400" />} />
          <StatCard label="Deployments" value={stats.deployments} icon={<Rocket size={18} className="text-slate-400" />} />
          <StatCard label="Successful" value={stats.success} />
          <StatCard label="Running" value={stats.running} icon={<Clock size={18} className="text-slate-400" />} />
        </section>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form className="space-y-3 rounded-lg border border-slate-200 bg-white p-4" onSubmit={createProject}>
            <div className="flex items-center gap-2">
              <Github size={18} />
              <h2 className="font-semibold text-slate-950">Register Project</h2>
            </div>
            <Field label="Project name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">GitHub repo</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.repoUrl}
                onChange={(event) => {
                  const repo = repos.find((item) => item.cloneUrl === event.target.value);
                  setForm({
                    ...form,
                    name: repo?.fullName?.split("/")[1] || form.name,
                    repoUrl: event.target.value,
                    branch: repo?.defaultBranch || form.branch
                  });
                }}
              >
                <option value="">Manual URL or select repo</option>
                {repos.map((repo) => <option key={repo.id} value={repo.cloneUrl}>{repo.fullName}</option>)}
              </select>
            </label>
            <Field label="Repo URL" value={form.repoUrl} onChange={(repoUrl) => setForm({ ...form, repoUrl })} />
            <Field label="Branch" value={form.branch} onChange={(branch) => setForm({ ...form, branch })} />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">App type</span>
              <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.appType} onChange={(event) => setForm({ ...form, appType: event.target.value })}>
                <option value="node">Node</option>
                <option value="go">Go</option>
                <option value="static">Static</option>
                <option value="docker">Docker</option>
              </select>
            </label>
            <Field label="Build command" value={form.buildCommand} onChange={(buildCommand) => setForm({ ...form, buildCommand })} />
            <Field label="Start command" value={form.startCommand} onChange={(startCommand) => setForm({ ...form, startCommand })} />
            <Field label="Domain" value={form.domain} onChange={(domain) => setForm({ ...form, domain })} />
            <Field label="Internal port" value={form.port} onChange={(port) => setForm({ ...form, port })} />
            <Field label="Health URL" value={form.healthUrl} onChange={(healthUrl) => setForm({ ...form, healthUrl })} />
            <button className="w-full rounded-md bg-slate-950 px-3 py-2 text-white">Save project</button>
          </form>

          <div className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-4">
                <h2 className="font-semibold text-slate-950">Projects</h2>
              </div>
              {projects.length === 0 ? (
                <div className="p-4"><EmptyState title="No projects yet" description="Connect a GitHub repo to start deploying." /></div>
              ) : projects.map((project) => (
                <article key={project.id} className="border-b border-slate-100 p-4 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-slate-950">{project.name}</h3>
                      <p className="text-sm text-slate-500">{project.repoUrl} · {project.branch}</p>
                      <p className="mt-1 text-sm text-slate-600">Status: {project.lastDeploymentStatus}</p>
                    </div>
                    <button className="rounded-md bg-slate-950 px-3 py-2 text-sm text-white" onClick={() => deploy(project.id)}>Deploy</button>
                  </div>
                </article>
              ))}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-4">
                <h2 className="font-semibold text-slate-950">Deployments</h2>
              </div>
              {deployments.map((deployment) => (
                <article key={deployment.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-b-0">
                  <div>
                    <p className="font-medium text-slate-950">{deployment.projectName}</p>
                    <p className="text-sm text-slate-500">{deployment.status} · {deployment.commit || "pending"} · {deployment.startedAt}</p>
                    {deployment.error && <p className="text-sm text-red-600">{deployment.error}</p>}
                  </div>
                  <button className="rounded-md border border-slate-200 px-3 py-2 text-sm" onClick={() => viewLogs(deployment.id)}>Logs</button>
                </article>
              ))}
            </section>
          </div>
        </section>

        {selectedLog && (
          <section className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Deployment Logs</h2>
              <button className="rounded-md border border-slate-700 px-3 py-1 text-sm" onClick={() => setSelectedLog("")}>Close</button>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap text-sm">{selectedLog}</pre>
          </section>
        )}
      </div>
    </Shell>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
