import { transitionJob, transitionRun } from "./productionRunState";
import type {
  BudgetLedgerSummary,
  ProductionArtifact,
  ProductionGate,
  ProductionJob,
  ProductionJobStatus,
  ProductionRun,
  ProductionRunStatus,
  ProductionStage,
  RunCommand,
} from "./productionRunTypes";

export type ProductionCommandEffect = {
  run: ProductionRun;
  eventType: string;
  message: string;
};

function record(payload: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = payload[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Missing ${key}`);
  return value as Record<string, unknown>;
}

function text(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${key}`);
  return value.trim();
}

const ARTIFACT_STATUSES = new Set<ProductionArtifact["status"]>([
  "candidate",
  "ready",
  "adopted",
  "rejected",
]);
const GATE_STATUSES = new Set<ProductionGate["status"]>(["waiting", "approved", "rejected", "expired", "revoked"]);

function artifact(payload: Record<string, unknown>): ProductionArtifact {
  const value = record(payload, "artifact");
  if (!ARTIFACT_STATUSES.has(value.status as ProductionArtifact["status"])) {
    throw new Error("Invalid artifact status");
  }
  return value as ProductionArtifact;
}

function replaceById<T>(items: T[], id: string, readId: (item: T) => string, update: (item: T) => T): T[] {
  let found = false;
  const next = items.map((item) => {
    if (readId(item) !== id) return item;
    found = true;
    return update(item);
  });
  if (!found) throw new Error(`Production entity not found: ${id}`);
  return next;
}

function validateBudget(value: Record<string, unknown>, current: BudgetLedgerSummary): BudgetLedgerSummary {
  const next = { ...current };
  for (const key of ["authorized", "reserved", "actual", "unsettled"] as const) {
    if (value[key] === undefined) continue;
    const amount = Number(value[key]);
    if (!Number.isFinite(amount) || amount < 0) throw new Error(`Invalid budget ${key}`);
    next[key] = amount;
  }
  if (typeof value.currency === "string" && value.currency.trim()) next.currency = value.currency.trim();
  if (next.reserved + next.actual + next.unsettled > next.authorized) {
    throw new Error("Budget liability exceeds authorization");
  }
  return next;
}

export function applyProductionCommand(
  current: ProductionRun,
  command: RunCommand,
  now: string,
): ProductionCommandEffect {
  switch (command.type) {
    case "run.status": {
      const status = text(command.payload, "status") as ProductionRunStatus;
      return { run: transitionRun(current, status, now), eventType: "run.status.changed", message: status };
    }
    case "run.stage": {
      const stageId = text(command.payload, "stageId");
      return { run: { ...current, stageId, updatedAt: now }, eventType: "run.stage.changed", message: stageId };
    }
    case "stage.upsert": {
      const stage = record(command.payload, "stage") as ProductionStage;
      const stages = current.stages.some((item) => item.stageId === stage.stageId)
        ? current.stages.map((item) => (item.stageId === stage.stageId ? stage : item))
        : [...current.stages, stage];
      return { run: { ...current, stages, updatedAt: now }, eventType: "stage.updated", message: stage.stageId };
    }
    case "job.add": {
      const job = record(command.payload, "job") as ProductionJob;
      if (current.jobs.some((item) => item.jobId === job.jobId)) throw new Error(`Duplicate job: ${job.jobId}`);
      return { run: { ...current, jobs: [...current.jobs, job], updatedAt: now }, eventType: "job.created", message: job.jobId };
    }
    case "job.status": {
      const jobId = text(command.payload, "jobId");
      const status = text(command.payload, "status") as ProductionJobStatus;
      const patch = command.payload.patch && typeof command.payload.patch === "object"
        ? command.payload.patch as Partial<ProductionJob>
        : {};
      const jobs = replaceById(current.jobs, jobId, (job) => job.jobId, (job) => ({
        ...transitionJob(job, status, now),
        ...patch,
        jobId: job.jobId,
        status,
        updatedAt: now,
      }));
      return { run: { ...current, jobs, updatedAt: now }, eventType: `job.${status}`, message: jobId };
    }
    case "gate.add": {
      const gate = record(command.payload, "gate") as ProductionGate;
      if (current.gates.some((item) => item.gateId === gate.gateId)) throw new Error(`Duplicate gate: ${gate.gateId}`);
      return { run: { ...current, gates: [...current.gates, gate], updatedAt: now }, eventType: "gate.waiting", message: gate.gateId };
    }
    case "gate.decide": {
      const gateId = text(command.payload, "gateId");
      const status = text(command.payload, "status") as ProductionGate["status"];
      if (!GATE_STATUSES.has(status) || status === "waiting") throw new Error("Invalid production gate decision");
      const currentGate = current.gates.find((gate) => gate.gateId === gateId);
      if (!currentGate) throw new Error(`Production entity not found: ${gateId}`);
      if (currentGate.status !== "waiting") throw new Error(`Production gate is already decided: ${gateId}`);
      const gates = replaceById(current.gates, gateId, (gate) => gate.gateId, (gate) => ({
        ...gate,
        status,
        decidedAt: now,
      }));
      const jobs = status === "approved"
        ? current.jobs.map((job) => currentGate.jobIds.includes(job.jobId) && job.status === "authorization_required"
          ? transitionJob(job, "authorized", now)
          : job)
        : current.jobs;
      const run = status === "approved" && current.status === "awaiting_contract"
        ? transitionRun({ ...current, gates, jobs }, "ready", now)
        : { ...current, gates, jobs, updatedAt: now };
      return { run, eventType: "gate.decided", message: gateId };
    }
    case "artifact.add": {
      const nextArtifact = artifact(command.payload);
      if (current.artifacts.some((item) => item.artifactId === nextArtifact.artifactId)) {
        throw new Error(`Duplicate artifact: ${nextArtifact.artifactId}`);
      }
      return { run: { ...current, artifacts: [...current.artifacts, nextArtifact], updatedAt: now }, eventType: "artifact.ready", message: nextArtifact.artifactId };
    }
    case "artifact.adopt": {
      const artifactId = text(command.payload, "artifactId");
      const artifacts = replaceById(current.artifacts, artifactId, (artifact) => artifact.artifactId, (artifact): ProductionArtifact => ({
        ...artifact,
        status: "adopted",
        adoptedAt: now,
      }));
      return { run: { ...current, artifacts, updatedAt: now }, eventType: "artifact.adopted", message: artifactId };
    }
    case "budget.set": {
      const budget = validateBudget(record(command.payload, "budget"), current.budget);
      return { run: { ...current, budget, updatedAt: now }, eventType: "budget.updated", message: budget.currency };
    }
    default:
      throw new Error(`Unknown production command: ${command.type}`);
  }
}
