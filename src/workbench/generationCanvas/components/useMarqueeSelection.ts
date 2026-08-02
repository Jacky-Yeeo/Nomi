// 框选 marquee（2026-07-31 用户拍板：Shift+左键拖空白）。拖拽画选框，抬起按 AABB 并入当前分类选区。
// 与平移分工：空白左键拖（无修饰）= 平移（useCanvasViewportGestures），按住 Shift 才进这里，二者按
// shiftKey 分工不抢。纯点击空白清空选择由平移路径的 pointerUp 负责；Shift+点击空白不清（追加意图）。
import React from 'react'

const MARQUEE_THRESHOLD = 4

type Offset = { x: number; y: number }

export type MarqueeRect = { left: number; top: number; width: number; height: number }

type UseMarqueeSelectionArgs = {
  readOnly: boolean
  stageRef: React.RefObject<HTMLDivElement>
  offsetRef: React.MutableRefObject<Offset>
  zoomRef: React.MutableRefObject<number>
  activeCategoryId: string
  selectNodesInRect: (rect: { x1: number; y1: number; x2: number; y2: number }, categoryId?: string, additive?: boolean) => void
}

export type MarqueeSelection = {
  marqueeRect: MarqueeRect | null
  handlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handlePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  handlePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
}

const EMPTY_TARGET_GUARD =
  '.generation-canvas-v2-node, .generation-canvas-v2-toolbar, .generation-canvas-v2__zoom-bar, .generation-canvas-v2__minimap, .generation-canvas-v2__selection-toolbar, .generation-canvas-v2__edge-hit, .generation-canvas-v2__edge-cut, button, input, textarea, select, [role="menu"], [role="menuitem"]'

export function useMarqueeSelection({
  readOnly,
  stageRef,
  offsetRef,
  zoomRef,
  activeCategoryId,
  selectNodesInRect,
}: UseMarqueeSelectionArgs): MarqueeSelection {
  const startRef = React.useRef<{ clientX: number; clientY: number; moved: boolean } | null>(null)
  const [marqueeRect, setMarqueeRect] = React.useState<MarqueeRect | null>(null)

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
    if (readOnly || event.button !== 0 || !event.shiftKey) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(EMPTY_TARGET_GUARD)) return
    startRef.current = { clientX: event.clientX, clientY: event.clientY, moved: false }
    setMarqueeRect(null)
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* 无活动指针时忽略 */ }
  }, [readOnly])

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    if (!start.moved) {
      if (Math.abs(event.clientX - start.clientX) < MARQUEE_THRESHOLD && Math.abs(event.clientY - start.clientY) < MARQUEE_THRESHOLD) return
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
    // Shift+纯点击空白（未拖动）：追加意图，不清选区、不选中
    if (!start.moved || !stage) return
    const bounds = stage.getBoundingClientRect()
    const z = zoomRef.current || 1
    const toCanvas = (clientX: number, clientY: number) => ({
      x: (clientX - bounds.left - offsetRef.current.x) / z,
      y: (clientY - bounds.top - offsetRef.current.y) / z,
    })
    const a = toCanvas(start.clientX, start.clientY)
    const b = toCanvas(event.clientX, event.clientY)
    selectNodesInRect({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, activeCategoryId, true)
  }, [activeCategoryId, offsetRef, selectNodesInRect, stageRef, zoomRef])

  return { marqueeRect, handlePointerDown, handlePointerMove, handlePointerUp }
}
