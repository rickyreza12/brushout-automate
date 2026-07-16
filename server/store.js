import fs from "node:fs/promises";
import path from "node:path";

const dataDir = path.resolve("data");
const dbPath = path.join(dataDir, "brushout.json");

const initialData = {
  projects: [],
  deployments: [],
  webhookEvents: []
};

export async function readDB() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(dbPath, "utf8"));
  } catch {
    await writeDB(initialData);
    return structuredClone(initialData);
  }
}

export async function writeDB(data) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

export function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
