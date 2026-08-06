// 框选 marquee：空白左键拖直接框选；Shift 只决定「追加」而不是「能不能开始」。
// 纯点击空白也由这里统一收口：普通点击清空，Shift+点击保留当前选区。
import React from 'react'
import { canvasDragExceededThreshold } from './canvasPointerGestureModel'

type Offset = { x: number; y: number }

export type MarqueeRect = { left: number; top: number; width: number; height: number }

type UseMarqueeSelectionArgs = {
  readOnly: boolean
  stageRef: React.RefObject<HTMLDivElement>
  offsetRef: React.MutableRefObject<Offset>
  zoomRef: React.MutableRefObject<number>
  activeCategoryId: string
  clearSelection: () => void
  selectNodesInRect: (rect: { x1: number; y1: number; x2: number; y2: number }, categoryId?: string, additive?: boolean) => void
}

export type MarqueeSelection = {
  marqueeRect: MarqueeRect | null
  cancel: () => void
  handlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handlePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  handlePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  handlePointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void
}

const EMPTY_TARGET_GUARD =
  '.generation-canvas-v2-node, .generation-canvas-v2-toolbar, .generation-canvas-v2__zoom-bar, .generation-canvas-v2__minimap, .generation-canvas-v2__selection-toolbar, .generation-canvas-v2__edge-hit, .generation-canvas-v2__edge-cut, button, input, textarea, select, [role="menu"], [role="menuitem"]'

export function useMarqueeSelection({
  readOnly,
  stageRef,
  offsetRef,
  zoomRef,
  activeCategoryId,
  clearSelection,
  selectNodesInRect,
}: UseMarqueeSelectionArgs): MarqueeSelection {
  const startRef = React.useRef<{ clientX: number; clientY: number; moved: boolean; additive: boolean } | null>(null)
  const [marqueeRect, setMarqueeRect] = React.useState<MarqueeRect | null>(null)

  const cancelMarquee = React.useCallback(() => {
    startRef.current = null
    setMarqueeRect(null)
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelMarquee()
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', cancelMarquee)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', cancelMarquee)
    }
  }, [cancelMarquee])

  const computeStageRect = React.useCallback((clientX: number, clientY: number) => {
    const start = startRef.current
    const stage = stageRef.current
    if (!start || !stage) return null
    const bounds = stage.getBoundingClientRect()
    const sx = start.clientX - bounds.left
    const sy = start.clientY - bounds.top
    const cx = clientX - bounds.left
    const cy = clientY - bounds.top
    return { left: Math.min(sx, cx), top: Math.min(sy, cy), width: Math.abs(cx - sx), height: Math.abs(cy - sy) }
  }, [stageRef])

  const handlePointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly || event.button !== 0) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(EMPTY_TARGET_GUARD)) return
    startRef.current = { clientX: event.clientX, clientY: event.clientY, moved: false, additive: event.shiftKey }
    setMarqueeRect(null)
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* 无活动指针时忽略 */ }
  }, [readOnly])

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    if (!start.moved) {
      if (!canvasDragExceededThreshold(start.clientX, start.clientY, event.clientX, event.clientY)) return
      start.moved = true
    }
    setMarqueeRect(computeStageRect(event.clientX, event.clientY))
  }, [computeStageRect])

  const handlePointerUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    startRef.current = null
    setMarqueeRect(null)
    const stage = stageRef.current
    if (
      typeof event.currentTarget.hasPointerCapture === 'function' &&
      typeof event.currentTarget.releasePointerCapture === 'function' &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!start.moved) {
      if (!start.additive) clearSelection()
      return
    }
    if (!stage) return
    const bounds = stage.getBoundingClientRect()
    const z = zoomRef.current || 1
    const toCanvas = (clientX: number, clientY: number) => ({
      x: (clientX - bounds.left - offsetRef.current.x) / z,
      y: (clientY - bounds.top - offsetRef.current.y) / z,
    })
    const a = toCanvas(start.clientX, start.clientY)
    const b = toCanvas(event.clientX, event.clientY)
    selectNodesInRect({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, activeCategoryId, start.additive)
  }, [activeCategoryId, clearSelection, offsetRef, selectNodesInRect, stageRef, zoomRef])

  const handlePointerCancel = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    cancelMarquee()
    if (
      typeof event.currentTarget.hasPointerCapture === 'function' &&
      typeof event.currentTarget.releasePointerCapture === 'function' &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [cancelMarquee])

  return { marqueeRect, cancel: cancelMarquee, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel }
}
