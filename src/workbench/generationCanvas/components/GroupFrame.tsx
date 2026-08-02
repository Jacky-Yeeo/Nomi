/**
 * GroupFrame — 画布上每个 group 的视觉包围框 + 拖动 handle。
 *
 * E.2C-30 抽离自 GenerationCanvas.tsx 内联实现（spec §6/Task E.2-8 要求）。
 * 单一职责：根据 groupBoxes 数据渲染 group 边框、标签、可拖动表面。
 * 不依赖 store；所有数据由调用方传入，便于将来虚拟化或换 dnd 后端。
 */
import React from 'react'
import { IconPlayerPlay } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../utils/cn'
import type { NodeGroup } from '../model/generationCanvasTypes'

export type CanvasGroupBox = {
  group: NodeGroup
  left: number
  top: number
  width: number
  height: number
  memberCount: number
}

export type GroupFrameProps = {
  box: CanvasGroupBox
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>, groupId: string) => void
  /** 整组运行：把组内成员喂给现成的依赖波次批量链路（进任务面板，进度/排队/取消白捡）。 */
  onRunGroup?: (groupId: string) => void
  /**
   * 有线待连时，组框变成可落点：落下 = 给组内每个成员各连一根（见 store.connectToGroup）。
   * 此时**不能**再走拖动 handle，否则一拖就把组挪走了。
   */
  pendingConnection?: boolean
  onConnectToGroup?: (groupId: string) => void
}

function getHexAlphaColor(color: string | undefined, alphaHex: string): string | undefined {
  const normalized = color?.trim()
  if (!normalized) return undefined
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return `${normalized}${alphaHex}`
  if (/^#[0-9a-fA-F]{3}$/.test(normalized)) {
    const [, r, g, b] = normalized
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`
  }
  return undefined
}

export default function GroupFrame({
  box,
  onPointerDown,
  onRunGroup,
  pendingConnection,
  onConnectToGroup,
}: GroupFrameProps): JSX.Element {
  const { t } = useTranslation()
  const groupColor = box.group.color || undefined
  const connectable = Boolean(pendingConnection && onConnectToGroup && box.memberCount > 0)
  return (
    <div
      className={cn(
        'generation-canvas-v2__group-box',
        'absolute pointer-events-auto select-none rounded-nomi-lg',
        'border-[1.5px] border-[color-mix(in_srgb,var(--nomi-accent)_55%,transparent)]',
        'bg-[color-mix(in_srgb,var(--nomi-accent)_8%,transparent)]',
        'shadow-[inset_0_0_0_1px_var(--workbench-frame-ring),0_14px_34px_rgba(18,24,38,0.055)]',
        connectable
          ? 'cursor-copy border-dashed border-nomi-accent bg-[color-mix(in_srgb,var(--nomi-accent)_16%,transparent)]'
          : 'cursor-grab active:cursor-grabbing',
      )}
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        ...(connectable ? {} : { borderColor: groupColor, backgroundColor: getHexAlphaColor(groupColor, '18') }),
      }}
      role="button"
      tabIndex={0}
      // 拖线松手时 useDragToConnect 靠这个属性在元素栈里认出组框（与 data-node-id 同一套命中法）。
      data-group-id={box.group.id}
      aria-label={
        connectable
          ? t('generationCommon.canvas.group.connectHere', { name: box.group.name, count: box.memberCount })
          : t('generationCommon.canvas.group.dragNamed', { name: box.group.name })
      }
      title={
        connectable
          ? t('generationCommon.canvas.group.connectHere', { name: box.group.name, count: box.memberCount })
          : t('generationCommon.canvas.group.drag')
      }
      onPointerDown={(event) => {
        // 有线待连时组框是落点不是把手：照常走拖动会把整组拽走(用户以为在连线)。
        if (connectable) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        onPointerDown(event, box.group.id)
      }}
      onClick={(event) => {
        if (!connectable) return
        event.stopPropagation()
        onConnectToGroup?.(box.group.id)
      }}
    >
      <div
        className={cn(
          'generation-canvas-v2__group-box-label',
          'absolute left-3 top-2 inline-flex min-h-[22px] max-w-[calc(100%-24px)] items-center gap-2',
          'rounded-full bg-nomi-accent px-[9px] py-[3px] text-micro font-[650] leading-[1.25] text-nomi-paper',
          'pointer-events-auto select-none shadow-[0_8px_18px_rgba(18,24,38,0.12)]',
          connectable ? 'cursor-copy' : 'cursor-grab active:cursor-grabbing',
        )}
        style={{ backgroundColor: groupColor }}
      >
        <span className="min-w-0 truncate">{box.group.name}</span>
        <span className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--workbench-veil-chip)] px-[5px] text-micro">
          {box.memberCount}
        </span>
        {onRunGroup && box.memberCount > 0 && !connectable ? (
          <>
            <span className="h-3 w-px bg-[var(--workbench-veil-chip)]" aria-hidden />
            <button
              type="button"
              data-group-run={box.group.id}
              className={cn(
                'inline-grid size-[18px] place-items-center rounded-full border-0 p-0',
                'cursor-pointer bg-transparent text-nomi-paper',
                'transition-colors duration-[var(--nomi-transition-fast)] hover:bg-[var(--workbench-veil-chip)]',
              )}
              aria-label={t('generationCommon.canvas.group.runAll', { count: box.memberCount })}
              title={t('generationCommon.canvas.group.runAll', { count: box.memberCount })}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onRunGroup(box.group.id)
              }}
            >
              <IconPlayerPlay size={11} stroke={2} aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export type GroupFrameListProps = {
  boxes: readonly CanvasGroupBox[]
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>, groupId: string) => void
  onRunGroup?: (groupId: string) => void
  pendingConnection?: boolean
  onConnectToGroup?: (groupId: string) => void
}

export function GroupFrameList({
  boxes,
  onPointerDown,
  onRunGroup,
  pendingConnection,
  onConnectToGroup,
}: GroupFrameListProps): JSX.Element {
  return (
    <div className="generation-canvas-v2__group-boxes pointer-events-none absolute inset-0 z-0">
      {boxes.map((box) => (
        <GroupFrame
          key={box.group.id}
          box={box}
          onPointerDown={onPointerDown}
          onRunGroup={onRunGroup}
          pendingConnection={pendingConnection}
          onConnectToGroup={onConnectToGroup}
        />
      ))}
    </div>
  )
}
