import path from "node:path";
import { readJsonFile, writeJsonFileAtomic } from "../jsonFile";
import { getSettingsRoot } from "./settingsRoot";

const PROJECT_LOCATION_FILE = "project-location.json";

export type ProjectLocationSettings = {
  projectsRoot: string | null;
};

function settingsPath(): string {
  return path.join(getSettingsRoot(), PROJECT_LOCATION_FILE);
}

function normalizeAbsolutePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !path.isAbsolute(trimmed)) return null;
  return path.normalize(trimmed);
}

export function readProjectLocationSettings(): ProjectLocationSettings {
  try {
    const stored = readJsonFile(settingsPath()) as { projectsRoot?: unknown } | null;
    return { projectsRoot: normalizeAbsolutePath(stored?.projectsRoot) };
  } catch {
    return { projectsRoot: null };
  }
}

export function writeProjectsRoot(projectsRoot: string | null): ProjectLocationSettings {
  const normalized = projectsRoot === null ? null : normalizeAbsolutePath(projectsRoot);
  if (projectsRoot !== null && !normalized) {
    throw new Error("Project location must be an absolute path");
  }
  const next = { projectsRoot: normalized };
  writeJsonFileAtomic(settingsPath(), next);
  return next;
}
