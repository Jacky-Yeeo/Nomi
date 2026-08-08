import type {
  ProductionArtifact,
  ProductionJob,
  ProductionRun,
} from '../../../electron/productionRun/productionRunTypes'

export type ProductionRunTone = 'working' | 'attention' | 'danger' | 'success' | 'neutral'
export type ProductionRunPrimaryAction = 'open-stage' | 'open-gate' | 'reconcile' | 'review-rough-cut' | 'open-export' | null

export type ProductionRunView = {
  tone: ProductionRunTone
  titleKey: string
  descriptionKey: string
  percent?: number
  primaryAction: ProductionRunPrimaryAction
  targetId?: string
  originHost: string
  preview?: {
    artifactId: string
    kind: ProductionArtifact['kind']
    thumbnailRelativePath: string
  }
  details: {
    completedStages: number
    totalStages: number
    budget: ProductionRun['budget']
  }
}

function safeRelativePath(value: string | undefined): value is string {
  if (!value || value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value)) return false
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) return false
  return !value.split(/[\\/]+/).includes('..')
}

function latestSafePreview(artifacts: ProductionArtifact[]): ProductionRunView['preview'] {
  const latest = [...artifacts]
    .filter((artifact) => artifact.status !== 'rejected' && safeRelativePath(artifact.thumbnailRelativePath))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  return latest?.thumbnailRelativePath
    ? { artifactId: latest.artifactId, kind: latest.kind, thumbnailRelativePath: latest.thumbnailRelativePath }
    : undefined
}

function latestJob(run: ProductionRun): ProductionJob | undefined {
  return [...run.jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
}

function validPercent(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : undefined
}

export function buildProductionRunView(
  run: ProductionRun,
  now = Date.now(),
  options: { staleAfterMs?: number } = {},
): ProductionRunView {
  const staleAfterMs = options.staleAfterMs ?? 2 * 60_000
  const job = latestJob(run)
  const unknown = run.jobs.find((value) => value.status === 'submission_unknown')
  const waitingGate = run.gates.find((value) => value.status === 'waiting')
  const base = {
    originHost: ['nomi', 'claude', 'codex', 'cursor'].includes(run.origin.host) ? run.origin.host : 'external',
    preview: latestSafePreview(run.artifacts),
    details: {
      completedStages: run.stages.filter((stage) => stage.status === 'completed').length,
      totalStages: run.stages.length,
      budget: run.budget,
    },
  }

  if (unknown) {
    return {
      ...base,
      tone: 'danger',
      titleKey: 'production.status.submissionUnknown',
      descriptionKey: 'production.description.submissionUnknown',
      primaryAction: 'reconcile',
      targetId: unknown.jobId,
    }
  }
  if (waitingGate) {
    return {
      ...base,
      tone: 'attention',
      titleKey: 'production.status.approvalRequired',
      descriptionKey: 'production.description.approvalRequired',
      primaryAction: 'open-gate',
      targetId: waitingGate.gateId,
    }
  }
  if (run.status === 'needs_attention' || job?.status === 'needs_attention') {
    return {
      ...base,
      tone: 'danger',
      titleKey: 'production.status.needsAttention',
      descriptionKey: 'production.description.needsAttention',
      primaryAction: 'open-stage',
      targetId: job?.jobId ?? run.stageId,
    }
  }
  const vendorStateAt = job?.lastVendorStateChangeAt ? Date.parse(job.lastVendorStateChangeAt) : Number.NaN
  const vendorIsStale = job && ['provider_accepted', 'polling', 'retry_wait'].includes(job.status)
    && Number.isFinite(vendorStateAt) && now - vendorStateAt >= staleAfterMs
  if (vendorIsStale) {
    return {
      ...base,
      tone: 'attention',
      titleKey: 'production.status.providerStale',
      descriptionKey: 'production.description.providerStale',
      primaryAction: 'open-stage',
      targetId: job.jobId,
    }
  }
  if (run.status === 'completed') {
    return {
      ...base,
      tone: 'success',
      titleKey: 'production.status.completed',
      descriptionKey: 'production.description.completed',
      primaryAction: null,
    }
  }
  if (run.status === 'awaiting_rough_cut_review') {
    return {
      ...base,
      tone: 'attention',
      titleKey: 'production.status.roughCutReady',
      descriptionKey: 'production.description.roughCutReady',
      primaryAction: 'review-rough-cut',
    }
  }
  if (run.status === 'awaiting_export') {
    return {
      ...base,
      tone: 'attention',
      titleKey: 'production.status.exportReady',
      descriptionKey: 'production.description.exportReady',
      primaryAction: 'open-export',
    }
  }
  const percent = validPercent(job?.progressPercent)
  return {
    ...base,
    tone: run.status === 'draft' ? 'neutral' : 'working',
    titleKey: run.status === 'draft' ? 'production.status.draft' : 'production.status.running',
    descriptionKey: run.status === 'draft' ? 'production.description.draft' : 'production.description.running',
    ...(percent === undefined ? {} : { percent }),
    primaryAction: 'open-stage',
    targetId: job?.jobId ?? run.stageId,
  }
}
