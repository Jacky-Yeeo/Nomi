/**
 * 「跑什么」这一族画布动作：编组 / 解组 / 生成选中 / 整组运行 / 连到组。
 *
 * 从 GenerationCanvas.tsx 抽出来：那个壳已经顶到 800 行上限（R9）。这几个动作共用同一条批量链路
 * （buildDependencyWaves + confirmAndRunPlan）、只吃 store 数据、都不碰视口/拖拽/连线几何，抽在一起最自然。
 */
import React from 'react'
import { useTranslation } from 'react-i18next'
import { showInfoToast } from '../../../utils/showInfoToast'
import { useGenerationCanvasStore } from '../store/generationCanvasStore'
import { buildDependencyWaves } from '../runner/dependencyWaves'
import { confirmAndRunPlan } from './batchPlanPreview'
import { buildContactSheetNode, contactSheetSources } from '../nodes/buildContactSheetNode'

export function useCanvasGroupActions(params: {
  activeCategoryId: string
  selectedGroupIds: string[]
  selectedNodeIds: string[]
}): {
  handleGroupSelectedNodes: () => void
  handleUngroupSelectedNodes: () => void
  handleBatchGenerate: () => void
  handleRunGroup: (groupId: string) => void
  handleConnectToGroup: (groupId: string) => void
  /** 选中里已出图的张数（<2 就没有联系表可拼，浮条上那个钮不出现）。 */
  contactSheetCount: number
  handleBuildContactSheet: () => void
} {
  const { activeCategoryId, selectedGroupIds, selectedNodeIds } = params
  const { t } = useTranslation()
  const groupSelectedNodes = useGenerationCanvasStore((state) => state.groupSelectedNodes)
  const ungroupGroups = useGenerationCanvasStore((state) => state.ungroupGroups)

  const handleGroupSelectedNodes = React.useCallback(() => {
    groupSelectedNodes(activeCategoryId)
    // 编组结果即时显示为画布上的组框 → 成功 toast 是噪音（弹窗审计 R2）。
  }, [activeCategoryId, groupSelectedNodes])

  const handleUngroupSelectedNodes = React.useCallback(() => {
    if (!selectedGroupIds.length) return
    ungroupGroups(selectedGroupIds)
    // 解组结果画布即时可见 → 成功 toast 是噪音（弹窗审计 R2）。
  }, [selectedGroupIds, ungroupGroups])

  // 批量生成（「生成选中」唯一入口）。不傻批量：先算依赖波次（参考先生成→镜头后生成）。
  // 用户拍板「不弹窗+缺啥提示啥」：点了就直接跑能跑的（不再弹模态确认条）；上游参考没生成
  // 而被拦下的，由 runPlanWithToasts 用人话 toast 告诉你「哪些没跑、为什么」(describeBlockedNotice)。
  const handleBatchGenerate = React.useCallback(() => {
    const ids = [...selectedNodeIds]
    if (ids.length === 0) return
    const state = useGenerationCanvasStore.getState()
    void confirmAndRunPlan(buildDependencyWaves(ids, { nodes: state.nodes, edges: state.edges }))
  }, [selectedNodeIds])

  // 整组运行：和「生成选中」同一条批量链路（buildDependencyWaves + confirmAndRunPlan），
  // 所以进度/排队/取消/连续失败刹车全部白捡（P1：不另起第二条调度）。
  const handleRunGroup = React.useCallback((groupId: string) => {
    const state = useGenerationCanvasStore.getState()
    const group = state.groups.find((candidate) => candidate.id === groupId)
    if (!group) return
    const memberIds = new Set(group.nodeIds)
    const ids = state.nodes
      .filter((node) => memberIds.has(node.id) && (node.categoryId || 'shots') === group.categoryId)
      .map((node) => node.id)
    if (!ids.length) return
    void confirmAndRunPlan(buildDependencyWaves(ids, { nodes: state.nodes, edges: state.edges }))
  }, [])

  // 连到组：给组内每个成员各连一根真边（图结构不变）。被能力校验跳过的必须说清，不许静默丢。
  const handleConnectToGroup = React.useCallback((groupId: string) => {
    const result = useGenerationCanvasStore.getState().connectToGroup(groupId)
    if (result.ok) {
      if (result.skipped > 0) {
        showInfoToast(t('generationCommon.canvas.group.connectedWithSkips', {
          connected: result.connected,
          skipped: result.skipped,
        }))
      }
      return
    }
    if (result.reason === 'all_skipped') {
      showInfoToast(t('generationCommon.canvas.group.connectAllSkipped', { count: result.skipped }))
    } else if (result.reason === 'group_empty') {
      showInfoToast(t('generationCommon.canvas.group.connectEmpty'))
    }
  }, [t])

  // 联系表：把选中的成图拼成一张，给客户/团队看整场戏。产物是普通图片节点（不新增节点 kind）。
  const nodes = useGenerationCanvasStore((state) => state.nodes)
  const contactSheetCount = React.useMemo(
    () => contactSheetSources(selectedNodeIds, nodes).length,
    [selectedNodeIds, nodes],
  )
  const handleBuildContactSheet = React.useCallback(() => {
    void buildContactSheetNode(selectedNodeIds)
  }, [selectedNodeIds])

  return {
    handleGroupSelectedNodes,
    handleUngroupSelectedNodes,
    handleBatchGenerate,
    handleRunGroup,
    handleConnectToGroup,
    contactSheetCount,
    handleBuildContactSheet,
  }
}
