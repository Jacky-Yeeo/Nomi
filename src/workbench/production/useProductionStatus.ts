import React from 'react'
import { useTranslation } from 'react-i18next'

import { alertDialog } from '../../design'
import { useGenerationCanvasStore } from '../generationCanvas/store/generationCanvasStore'
import { useSpendConfirmStore } from '../generationCanvas/spend/spendConfirm'
import { buildProductionContractView } from '../generationCanvas/spend/productionContractView'
import { useWorkbenchStore } from '../workbenchStore'
import { productionRunApi } from './productionRunApi'
import { useProductionRunStore } from './productionRunStore'
import { buildProductionRunView, type ProductionRunPrimaryAction } from './productionRunView'
import { useActiveProductionRun } from './useActiveProductionRun'

export function useProductionStatus() {
  const { t } = useTranslation()
  const production = useActiveProductionRun()
  const view = React.useMemo(
    () => production.run ? buildProductionRunView(production.run) : null,
    [production.run],
  )

  const onPrimaryAction = React.useCallback(async (action: Exclude<ProductionRunPrimaryAction, null>) => {
    const run = production.run
    if (!run) return
    const targetJob = run.jobs.find((job) => job.jobId === view?.targetId)
      ?? [...run.jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

    if (action === 'open-stage') {
      if (targetJob?.nodeId) useGenerationCanvasStore.getState().selectNode(targetJob.nodeId)
      useWorkbenchStore.getState().setWorkspaceMode('generation')
      useWorkbenchStore.getState().requestCanvasFit()
      return
    }
    if (action === 'review-rough-cut' || action === 'open-export') {
      useWorkbenchStore.getState().setWorkspaceMode('preview')
      return
    }
    if (action === 'reconcile') {
      if (targetJob?.nodeId) useGenerationCanvasStore.getState().selectNode(targetJob.nodeId)
      await alertDialog({
        title: t('generationCommon.production.reconcile.title'),
        message: t('generationCommon.production.reconcile.message', {
          provider: targetJob?.provider || t('generationCommon.production.reconcile.unknownProvider'),
          taskId: targetJob?.providerTaskId || t('generationCommon.production.reconcile.noTaskId'),
        }),
      })
      return
    }

    const gate = run.gates.find((item) => item.gateId === view?.targetId && item.status === 'waiting')
      ?? run.gates.find((item) => item.status === 'waiting')
    if (!gate) return
    const approved = await useSpendConfirmStore.getState().requestConfirm({
      title: gate.title,
      message: gate.summary,
      confirmLabel: t('generationCommon.production.gate.approve'),
      source: run.origin.host === 'nomi' ? 'user' : 'agent',
      kind: 'contract',
      contract: buildProductionContractView(run, gate),
    })
    if (!approved) return
    try {
      await productionRunApi.command(run.projectId, run.runId, {
        commandId: globalThis.crypto.randomUUID(),
        expectedRevision: run.revision,
        type: 'gate.decide',
        payload: { gateId: gate.gateId, status: 'approved' },
        issuedAt: new Date().toISOString(),
      })
      await useProductionRunStore.getState().load(run.projectId)
    } catch (error) {
      await alertDialog({
        title: t('generationCommon.production.gate.failed'),
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }, [production.run, t, view?.targetId])

  return { production, view, onPrimaryAction }
}
