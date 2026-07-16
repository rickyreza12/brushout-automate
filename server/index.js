import crypto from "node:crypto";
import fs from "node:fs/promises";
import express from "express";
import { createId, readDB, writeDB } from "./store.js";
import { runDeployment } from "./deploy.js";

const app = express();
const port = Number(process.env.PORT || 4500);
const adminToken = process.env.ADMIN_TOKEN || "dev-token";

app.use(express.json({
  verify: (req, _res, buffer) => {
    req.rawBody = buffer;
  }
}));

app.use((req, res, next) => {
  if (req.path.startsWith("/api") && !["/api/health", "/api/login"].includes(req.path)) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token !== adminToken) return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/login", (req, res) => {
  if (req.body?.token !== adminToken) return res.status(401).json({ error: "invalid token" });
  res.json({ token: adminToken });
});

app.get("/api/github/repos", async (_req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.json({ repos: [] });
  const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  });
  if (!response.ok) return res.status(response.status).json({ error: "failed to load repositories" });
  const repos = await response.json();
  res.json({
    repos: repos.map((repo) => ({
      id: repo.id,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      cloneUrl: repo.clone_url,
      private: repo.private
    }))
  });
});

app.get("/api/projects", async (_req, res) => {
  const db = await readDB();
  res.json({ projects: db.projects });
});

app.post("/api/projects", async (req, res) => {
  const payload = req.body || {};
  if (!payload.name || !payload.repoUrl || !payload.branch) {
    return res.status(400).json({ error: "name, repoUrl, and branch are required" });
  }
  const db = await readDB();
  const project = {
    id: createId("prj"),
    name: payload.name,
    repoUrl: payload.repoUrl,
    branch: payload.branch,
    appType: payload.appType || "node",
    buildCommand: payload.buildCommand || "",
    startCommand: payload.startCommand || "",
    domain: payload.domain || "",
    port: payload.port || "",
    healthUrl: payload.healthUrl || "",
    enabled: true,
    createdAt: new Date().toISOString(),
    lastDeploymentStatus: "never",
    lastDeployedAt: null,
    lastCommit: null
  };
  db.projects.unshift(project);
  await writeDB(db);
  res.status(201).json({ project });
});

app.patch("/api/projects/:id", async (req, res) => {
  const db = await readDB();
  const index = db.projects.findIndex((project) => project.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "project not found" });
  db.projects[index] = { ...db.projects[index], ...req.body, id: req.params.id };
  await writeDB(db);
  res.json({ project: db.projects[index] });
});

app.delete("/api/projects/:id", async (req, res) => {
  const db = await readDB();
  db.projects = db.projects.filter((project) => project.id !== req.params.id);
  await writeDB(db);
  res.json({ status: "ok" });
});

app.post("/api/projects/:id/deploy", async (req, res) => {
  runDeployment(req.params.id).catch(() => undefined);
  res.status(202).json({ status: "queued" });
});

app.get("/api/deployments", async (_req, res) => {
  const db = await readDB();
  res.json({ deployments: db.deployments.slice(0, 50) });
});

app.get("/api/deployments/:id/logs", async (req, res) => {
  const db = await readDB();
  const deployment = db.deployments.find((item) => item.id === req.params.id);
  if (!deployment?.logPath) return res.status(404).json({ error: "logs not found" });
  try {
    const logs = await fs.readFile(deployment.logPath, "utf8");
    res.type("text/plain").send(logs);
  } catch {
    res.status(404).json({ error: "logs not found" });
  }
});

app.post("/webhooks/github", async (req, res) => {
  if (!validGithubSignature(req)) return res.status(401).json({ error: "invalid signature" });
  const db = await readDB();
  const event = {
    id: createId("wh"),
    source: "github",
    event: req.headers["x-github-event"],
    repo: req.body?.repository?.full_name,
    ref: req.body?.ref,
    receivedAt: new Date().toISOString()
  };
  db.webhookEvents.unshift(event);
  await writeDB(db);

  const branch = event.ref?.replace("refs/heads/", "");
  const project = db.projects.find((item) => event.repo && item.repoUrl.includes(event.repo) && item.branch === branch);
  if (project) runDeployment(project.id).catch(() => undefined);
  res.json({ status: "ok", matchedProject: project?.id || null });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist"));
  app.get("*", (_req, res) => res.sendFile("index.html", { root: "dist" }));
}

app.listen(port, () => {
  console.log(`Brushout Automate running on :${port}`);
});

function validGithubSignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true;
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
