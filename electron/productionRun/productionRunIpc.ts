import { ipcMain } from "electron";

import { createProductionRunRepository, type ProductionRunRepository } from "./productionRunRepository";
import type { CreateProductionRunInput, RunCommand } from "./productionRunTypes";

const RENDERER_COMMAND_TYPES = new Set(["run.status", "gate.decide", "artifact.adopt"]);

function identifier(value: unknown, label: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(normalized)) throw new Error(`Invalid ${label} id`);
  return normalized;
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${label}`);
  return value as Record<string, unknown>;
}

function rendererCommandPayload(type: string, value: unknown): Record<string, unknown> {
  const raw = objectValue(value, "production command payload");
  if (type === "run.status") {
    return { status: typeof raw.status === "string" ? raw.status.trim() : raw.status };
  }
  if (type === "gate.decide") {
    return {
      gateId: identifier(raw.gateId, "gate"),
      status: typeof raw.status === "string" ? raw.status.trim() : raw.status,
    };
  }
  return { artifactId: identifier(raw.artifactId, "artifact") };
}

function createDraftInput(value: unknown): CreateProductionRunInput {
  const raw = objectValue(value, "production draft");
  const playbook = objectValue(raw.playbook, "playbook");
  const origin = objectValue(raw.origin, "origin");
  return {
    projectId: identifier(raw.projectId, "project"),
    playbook: {
      name: identifier(playbook.name, "playbook"),
      version: typeof playbook.version === "string" && playbook.version.trim() ? playbook.version.trim() : "1.0.0",
    },
    origin: {
      host: identifier(origin.host, "origin host"),
      ...(typeof origin.actorId === "string" && origin.actorId.trim() ? { actorId: origin.actorId.trim() } : {}),
    },
  };
}

function rendererCommand(value: unknown): RunCommand {
  const raw = objectValue(value, "production command");
  const type = typeof raw.type === "string" ? raw.type.trim() : "";
  if (!RENDERER_COMMAND_TYPES.has(type)) throw new Error("Production command is not available to the renderer");
  if (!Number.isInteger(raw.expectedRevision) || Number(raw.expectedRevision) < 0) {
    throw new Error("Invalid production command revision");
  }
  return {
    commandId: identifier(raw.commandId, "command"),
    expectedRevision: Number(raw.expectedRevision),
    type,
    payload: rendererCommandPayload(type, raw.payload),
    issuedAt: typeof raw.issuedAt === "string" && raw.issuedAt.trim() ? raw.issuedAt.trim() : new Date().toISOString(),
  };
}

function projectRunPayload(value: unknown): { projectId: string; runId: string; raw: Record<string, unknown> } {
  const raw = objectValue(value, "production run request");
  return {
    projectId: identifier(raw.projectId, "project"),
    runId: identifier(raw.runId, "run"),
    raw,
  };
}

function assertProjectRun(repository: ProductionRunRepository, projectId: string, runId: string) {
  const run = repository.read(projectId, runId);
  if (!run) throw new Error(`Production run not found: ${runId}`);
  if (run.projectId !== projectId) throw new Error("Production run project mismatch");
  return run;
}

export function registerProductionRunIpc(
  repository: ProductionRunRepository = createProductionRunRepository(),
): void {
  ipcMain.handle("nomi:production-runs:list", async (_event, payload: unknown) => {
    const raw = objectValue(payload, "production run list request");
    return repository.list(identifier(raw.projectId, "project"));
  });
  ipcMain.handle("nomi:production-runs:read", async (_event, payload: unknown) => {
    const { projectId, runId } = projectRunPayload(payload);
    const run = repository.read(projectId, runId);
    if (run && run.projectId !== projectId) throw new Error("Production run project mismatch");
    return run;
  });
  ipcMain.handle("nomi:production-runs:create-draft", async (_event, payload: unknown) =>
    repository.create(createDraftInput(payload)));
  ipcMain.handle("nomi:production-runs:command", async (_event, payload: unknown) => {
    const { projectId, runId, raw } = projectRunPayload(payload);
    assertProjectRun(repository, projectId, runId);
    return repository.execute(projectId, runId, rendererCommand(raw.command));
  });
  ipcMain.handle("nomi:production-runs:events", async (_event, payload: unknown) => {
    const { projectId, runId, raw } = projectRunPayload(payload);
    assertProjectRun(repository, projectId, runId);
    const cursor = raw.afterCursor === undefined ? 0 : Number(raw.afterCursor);
    if (!Number.isInteger(cursor) || cursor < 0) throw new Error("Invalid production event cursor");
    return repository.readEvents(projectId, runId, cursor);
  });
}
