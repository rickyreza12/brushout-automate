import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createId, readDB, writeDB } from "./store.js";

const baseDir = process.env.BRUSHOUT_BASE_DIR || path.resolve("runtime/apps");
const logDir = process.env.BRUSHOUT_LOG_DIR || path.resolve("runtime/logs");

const activeDeployments = new Set();

export async function runDeployment(projectId) {
  if (activeDeployments.has(projectId)) {
    throw new Error("deployment already running for this project");
  }

  const db = await readDB();
  const project = db.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("project not found");

  activeDeployments.add(projectId);
  const deployment = {
    id: createId("dep"),
    projectId,
    projectName: project.name,
    commit: null,
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    logPath: null,
    error: null
  };
  db.deployments.unshift(deployment);
  await writeDB(db);

  await fs.mkdir(baseDir, { recursive: true });
  await fs.mkdir(logDir, { recursive: true });

  const projectDir = path.join(baseDir, safeName(project.name));
  const logPath = path.join(logDir, `${deployment.id}.log`);
  deployment.logPath = logPath;

  try {
    await appendLog(logPath, `Deploying ${project.name}\n`);
    await ensureRepo(project, projectDir, logPath);
    const commit = await run("git", ["rev-parse", "--short", "HEAD"], projectDir, logPath);
    deployment.commit = commit.trim();

    if (project.buildCommand) {
      await runShell(project.buildCommand, projectDir, logPath);
    }

    if (project.startCommand) {
      await appendLog(logPath, `Start command configured: ${project.startCommand}\n`);
    }

    deployment.status = "success";
  } catch (error) {
    deployment.status = "failed";
    deployment.error = error.message;
    await appendLog(logPath, `ERROR: ${error.message}\n`);
  } finally {
    deployment.finishedAt = new Date().toISOString();
    activeDeployments.delete(projectId);
    const latest = await readDB();
    latest.deployments = latest.deployments.map((item) => item.id === deployment.id ? deployment : item);
    latest.projects = latest.projects.map((item) => item.id === projectId ? {
      ...item,
      lastDeploymentStatus: deployment.status,
      lastDeployedAt: deployment.finishedAt,
      lastCommit: deployment.commit
    } : item);
    await writeDB(latest);
  }

  return deployment;
}

async function ensureRepo(project, projectDir, logPath) {
  try {
    await fs.access(path.join(projectDir, ".git"));
    await run("git", ["fetch", "origin", project.branch], projectDir, logPath);
    await run("git", ["checkout", project.branch], projectDir, logPath);
    await run("git", ["pull", "origin", project.branch], projectDir, logPath);
  } catch {
    await fs.rm(projectDir, { recursive: true, force: true });
    await run("git", ["clone", "--branch", project.branch, project.repoUrl, projectDir], baseDir, logPath);
  }
}

function runShell(command, cwd, logPath) {
  const shell = process.platform === "win32" ? "powershell.exe" : "bash";
  const args = process.platform === "win32" ? ["-NoProfile", "-Command", command] : ["-lc", command];
  return run(shell, args, cwd, logPath);
}

function run(command, args, cwd, logPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env });
    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
      appendLog(logPath, data.toString());
    });
    child.stderr.on("data", (data) => appendLog(logPath, data.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function appendLog(logPath, message) {
  await fs.appendFile(logPath, redact(message));
}

function redact(value) {
  return value
    .replaceAll(process.env.GITHUB_TOKEN || "__NO_TOKEN__", "[redacted]")
    .replaceAll(process.env.ADMIN_TOKEN || "__NO_TOKEN__", "[redacted]");
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}
