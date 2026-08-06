// 顶栏「任务」入口。住 NomiAppBar 右栏 —— 那是唯一跨创作/生成/预览三区常驻的 chrome，
// 正是「切到创作页就看不见生成跑到哪了」的解药。
// 方案：docs/plan/2026-08-02-task-center-queue.md，样张 2026-08-02 拍板。
//
// 按钮同时表达“任务列表入口”和当前状态：名称常显，有活时 accent + 数字徽标，失败时转提醒色。
import React from 'react'
import { useTranslation } from 'react-i18next'
import { IconListDetails } from '@tabler/icons-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, WorkbenchButton } from '../../design'
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

export function TaskCenterButton({ onRevealNode }: Props): JSX.Element {
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

  return (
    <>
      <TooltipProvider delayDuration={250} disableHoverableContent>
        <Tooltip>
          <TooltipTrigger asChild>
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
              data-task-center-trigger="true"
              onClick={() => setOpened((value) => !value)}
            >
              <IconListDetails size={15} stroke={1.8} />
              <span className="max-[1400px]:hidden">{t('taskCenter.title')}</span>
              {pending > 0 ? (
                <span className="min-w-4 rounded-pill bg-nomi-paper px-1 text-center text-micro tabular-nums text-nomi-accent">
                  {pending}
                </span>
              ) : null}
            </WorkbenchButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('taskCenter.title')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TaskCenterPanel
        opened={opened}
        onClose={() => setOpened(false)}
        {...(onRevealNode ? { onRevealNode } : {})}
      />
    </>
  )
}
