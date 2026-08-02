// 顶栏「任务」入口。住 NomiAppBar 右栏 —— 那是唯一跨创作/生成/预览三区常驻的 chrome，
// 正是「切到创作页就看不见生成跑到哪了」的解药。
// 方案：docs/plan/2026-08-02-task-center-queue.md，样张 2026-08-02 拍板。
//
// **按钮本身就是进度指示器**：有活时 accent 底 + 数字，跑完有失败转提醒色，闲时是安静的 ghost 图标。
// 不用点开就知道还有几个在跑。
import React from 'react'
import { useTranslation } from 'react-i18next'
import { IconProgress } from '@tabler/icons-react'
import { WorkbenchButton } from '../../design'
import { cn } from '../../utils/cn'
import { useGenerationCanvasStore } from '../generationCanvas/store/generationCanvasStore'
import { useGenerationQueueStore } from '../generationCanvas/runner/generationQueueStore'
import { TaskCenterPanel } from './TaskCenterPanel'
import { buildTaskCenterView, resolveTaskButtonTone } from './taskCenterEntries'
import { useBatchFinishNotifier } from './useBatchFinishNotifier'

type Props = {
  /** 点任务行时把用户带到画布上那个节点。 */
  onRevealNode?: (nodeId: string) => void
}

export function TaskCenterButton({ onRevealNode }: Props): JSX.Element | null {
  const { t } = useTranslation()
  const [opened, setOpened] = React.useState(false)
  const entries = useGenerationQueueStore((state) => state.entries)
  const batches = useGenerationQueueStore((state) => state.batches)
  const nodes = useGenerationCanvasStore((state) => state.nodes)

  // 失焦提醒的订阅住这里：本按钮全程挂载（跟着顶栏），是最稳的宿主。
  useBatchFinishNotifier()

  // E2E 专用桥（同 CameraMoveCaptureHost 的既有写法）：仅当 localStorage['__nomiE2E']==='1' 时把队列 store
  // 挂到 window，供 R13 走查在页面上下文里摆出各种队列状态截图取证。生产从不置该标志 → 永不暴露。
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage?.getItem('__nomiE2E') === '1') {
        ;(window as unknown as { __nomiQueueStore?: unknown }).__nomiQueueStore = useGenerationQueueStore
      }
    } catch {
      // localStorage 不可用 → 跳过
    }
  }, [])

  const summary = React.useMemo(
    () => buildTaskCenterView({ entries, batches, nodes, fallbackTitle: '', now: Date.now() }).summary,
    [entries, batches, nodes],
  )
  const tone = resolveTaskButtonTone(summary)
  const pending = summary.running + summary.queued

  // 闲着且从没跑过 → 不占顶栏的位置（顶栏已经挤，见 onboarding-handbook-shipped 的教训）。
  if (tone === 'idle' && entries.length === 0 && !opened) return null

  return (
    <>
      <WorkbenchButton
        className={cn(
          'nomi-appbar__ghost',
          'app-no-drag',
          'inline-flex items-center gap-1.5 h-[30px] px-2.5',
          'border border-transparent rounded-[var(--nomi-radius-sm)]',
          'font-inherit text-body-sm',
          'transition-[background,color] duration-[var(--nomi-transition-fast)]',
          tone === 'busy'
            ? 'bg-nomi-accent text-nomi-paper hover:bg-nomi-accent'
            : tone === 'failed'
              ? 'bg-transparent text-nomi-danger hover:bg-nomi-ink-05'
              : 'bg-transparent text-nomi-ink-80 hover:bg-nomi-ink-05 hover:text-nomi-ink',
        )}
        aria-label={t('taskCenter.title')}
        title={t('taskCenter.title')}
        onClick={() => setOpened((value) => !value)}
      >
        {/* 顶栏操作按钮统一解剖：图标 15/1.8（与同栏设置/模型接入/导出一致）。 */}
        <IconProgress size={15} stroke={1.8} />
        {pending > 0 ? <span className="text-micro tabular-nums">{pending}</span> : null}
      </WorkbenchButton>
      <TaskCenterPanel
        opened={opened}
        onClose={() => setOpened(false)}
        {...(onRevealNode ? { onRevealNode } : {})}
      />
    </>
  )
}
