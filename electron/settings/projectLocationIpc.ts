import { dialog, ipcMain, shell } from "electron";
import type { OpenDialogOptions } from "electron";
import fs from "node:fs";
import path from "node:path";
import { ensureDir, getProjectLocationState, type ProjectLocationState } from "../runtimePaths";
import { writeProjectsRoot } from "./projectLocationSettings";

export type ProjectLocationError =
  | "not-directory"
  | "not-writable"
  | "open-failed"
  | "managed-by-environment";

export type ProjectLocationResult =
  | { ok: true; location: ProjectLocationState; canceled?: boolean }
  | { ok: false; error: ProjectLocationError };

type PickerResult = { canceled: boolean; filePaths: string[] };
type ValidateRoot = (rootPath: string) => ProjectLocationError | null;

export type ProjectLocationPickerDeps = {
  showOpenDialog: (options: OpenDialogOptions) => Promise<PickerResult>;
  validateRoot?: ValidateRoot;
};

export type ProjectLocationRevealDeps = {
  openPath: (rootPath: string) => Promise<string>;
};

export function validateProjectLocationRoot(rootPath: string): ProjectLocationError | null {
  const resolved = path.resolve(rootPath);
  try {
    if (fs.existsSync(resolved) && !fs.statSync(resolved).isDirectory()) return "not-directory";
    ensureDir(resolved);
    if (!fs.statSync(resolved).isDirectory()) return "not-directory";
    fs.accessSync(resolved, fs.constants.W_OK);
    return null;
  } catch {
    return "not-writable";
  }
}

export function getProjectLocationResponse(): ProjectLocationResult {
  return { ok: true, location: getProjectLocationState() };
}

export async function pickProjectLocation(
  deps: ProjectLocationPickerDeps = {
    showOpenDialog: (options) => dialog.showOpenDialog(options),
  },
): Promise<ProjectLocationResult> {
  const current = getProjectLocationState();
  if (current.source === "environment") return { ok: false, error: "managed-by-environment" };

  const result = await deps.showOpenDialog({
    defaultPath: current.path,
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) {
    return { ok: true, canceled: true, location: current };
  }

  const selectedRoot = path.resolve(result.filePaths[0]);
  const validationError = (deps.validateRoot || validateProjectLocationRoot)(selectedRoot);
  if (validationError) return { ok: false, error: validationError };

  writeProjectsRoot(selectedRoot);
  return getProjectLocationResponse();
}

export function resetProjectLocation(): ProjectLocationResult {
  if (getProjectLocationState().source === "environment") {
    return { ok: false, error: "managed-by-environment" };
  }
  writeProjectsRoot(null);
  return getProjectLocationResponse();
}

export async function revealProjectLocation(
  deps: ProjectLocationRevealDeps = { openPath: (rootPath) => shell.openPath(rootPath) },
): Promise<ProjectLocationResult> {
  const location = getProjectLocationState();
  const validationError = validateProjectLocationRoot(location.path);
  if (validationError) return { ok: false, error: validationError };

  try {
    const openError = await deps.openPath(location.path);
    return openError ? { ok: false, error: "open-failed" } : { ok: true, location };
  } catch {
    return { ok: false, error: "open-failed" };
  }
}

export function registerProjectLocationIpc(): void {
  ipcMain.handle("nomi:settings:project-location-get", () => getProjectLocationResponse());
  ipcMain.handle("nomi:settings:project-location-pick", () => pickProjectLocation());
  ipcMain.handle("nomi:settings:project-location-reset", () => resetProjectLocation());
  ipcMain.handle("nomi:settings:project-location-reveal", () => revealProjectLocation());
}
