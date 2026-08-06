// 画布视口手势控制器（从 GenerationCanvas 抽出，R9/R12 防巨壳）。
// 收口三类输入（2026-07-31 用户拍板 #832，2026-08-03 补齐二选一）：
//   · 滚轮：**语义可配**（canvasGesturePreference）——默认缩放锚光标（ComfyUI 式），
//     可切成平移（Figma 式，给触控板党）；⌘/Ctrl+滚轮与捏合**两档恒缩放**。卡内可滚区放行原生滚动。
//   · 空格+左键拖 / 中键拖 / 右键拖 = 平移（右键拖超阈值才吞掉右键菜单）。
//   · 空白左键拖统一交给 useMarqueeSelection，视口层不再占用框选的自然入口。
// 同时托管视口变换原语（scheduleOffset / setViewportTransform / zoomAtStagePoint），
// 平移与离散缩放都走 rAF 批处理，消除快速输入的多次 setState 抖动。
import React from 'react'
import { clampNumber, getWheelZoomFactor } from './generationCanvasGeometry'
import { findScrollableAncestor } from './canvasScroll'
import { resolveWheelIntent, useCanvasGestureScheme } from './canvasGesturePreference'
import {
  canvasDragExceededThreshold,
  isCanvasPanButtonHeld,
  resolveCanvasPanButtonFromMove,
  resolveCanvasPointerDownAction,
  shouldPreventDefaultForCanvasPanStart,
} from './canvasPointerGestureModel'

type Offset = { x: number; y: number }
type Viewport = { zoom: number; offset: Offset }

type UseCanvasViewportGesturesArgs = {
  readOnly: boolean
  stageRef: React.RefObject<HTMLDivElement>
  offsetRef: React.MutableRefObject<Offset>
  zoomRef: React.MutableRefObject<number>
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>
  setContextNodeMenu: (value: null) => void
  setActiveEdge: (value: null) => void
  activeEdgeId: string | null
}

export type CanvasViewportGestures = {
  isPanning: boolean
  /** 空格按住中 → 外壳切 grab 光标，提示「现在拖就是平移」 */
  isSpaceHeld: boolean
  scheduleOffset: (offset: Offset) => void
  setViewportTransform: (zoom: number, offset: Offset) => void
  animateViewportTo: (zoom: number, offset: Offset, duration?: number) => void
  zoomAtStagePoint: (zoom: number, point: { x: number; y: number }) => void
  handlePointerDownCapture: (event: React.PointerEvent<HTMLDivElement>) => void
  handlePointerMove: (event: React.PointerEvent<HTMLDivElement>) => boolean
  handlePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  handlePointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void
  /** onContextMenu 先调它：右键拖平移后返回 true 表示该吞掉菜单 */
  shouldSuppressContextMenu: () => boolean
}

export function useCanvasViewportGestures({
  readOnly,
  stageRef,
  offsetRef,
  zoomRef,
  setViewport,
  setContextNodeMenu,
  setActiveEdge,
  activeEdgeId,
}: UseCanvasViewportGesturesArgs): CanvasViewportGestures {
  const offsetFrameRef = React.useRef<number | null>(null)
  const pendingOffsetRef = React.useRef<Offset | null>(null)
  const animFrameRef = React.useRef<number | null>(null)
  const isPanningRef = React.useRef(false)
  const panStartRef = React.useRef<{
    pointerId: number
    clientX: number
    clientY: number
    offsetX: number
    offsetY: number
    button: 0 | 1 | 2
    moved: boolean
  } | null>(null)
  const lastPointerPositionRef = React.useRef<{ pointerId: number; clientX: number; clientY: number } | null>(null)
  const activePointerButtonsRef = React.useRef(0)
  const suppressContextMenuRef = React.useRef(false)
  const spaceHeldRef = React.useRef(false)
  const [isPanning, setIsPanning] = React.useState(false)
  const [isSpaceHeld, setIsSpaceHeld] = React.useState(false)
  const gestureScheme = useCanvasGestureScheme()

  const resetPanState = React.useCallback(() => {
    isPanningRef.current = false
    setIsPanning(false)
    panStartRef.current = null
    lastPointerPositionRef.current = null
  }, [])

  const releaseSpace = React.useCallback(() => {
    if (!spaceHeldRef.current) return
    spaceHeldRef.current = false
    setIsSpaceHeld(false)
  }, [])

  const cancelAnim = React.useCallback(() => {
    if (animFrameRef.current !== null) {
      window.cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [])

  const scheduleOffset = React.useCallback((nextOffset: Offset) => {
    cancelAnim() // 任何手动平移立即接管，打断进行中的动画
    offsetRef.current = nextOffset
    pendingOffsetRef.current = nextOffset
    if (offsetFrameRef.current !== null) return
    offsetFrameRef.current = window.requestAnimationFrame(() => {
      offsetFrameRef.current = null
      const pending = pendingOffsetRef.current
      pendingOffsetRef.current = null
      if (pending) setViewport((current) => ({ ...current, offset: pending }))
    })
  }, [cancelAnim, offsetRef, setViewport])

  const setViewportTransform = React.useCallback((nextZoom: number, nextOffset: Offset) => {
    cancelAnim()
    if (offsetFrameRef.current !== null) {
      window.cancelAnimationFrame(offsetFrameRef.current)
      offsetFrameRef.current = null
    }
    pendingOffsetRef.current = null
    zoomRef.current = nextZoom
    offsetRef.current = nextOffset
    setViewport({ zoom: nextZoom, offset: nextOffset })
  }, [cancelAnim, offsetRef, setViewport, zoomRef])

  // 离散跳转（适应视图 / 重置 / 聚焦节点）的平滑过渡：rAF 在 ~140ms（--nomi-transition-fast）
  // 内 easeOutCubic 插值 zoom+offset。连续控件（缩放条/捏合）不走这里，保持即时跟手。
  const animateViewportTo = React.useCallback((targetZoom: number, targetOffset: Offset, duration = 140) => {
    cancelAnim()
    if (offsetFrameRef.current !== null) {
      window.cancelAnimationFrame(offsetFrameRef.current)
      offsetFrameRef.current = null
    }
    pendingOffsetRef.current = null
    const startZoom = zoomRef.current || 1
    const startOffset = { ...offsetRef.current }
    let startTs: number | null = null
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const step = (ts: number) => {
      if (startTs === null) startTs = ts
      const progress = duration <= 0 ? 1 : Math.min(1, (ts - startTs) / duration)
      const e = ease(progress)
      const zoom = startZoom + (targetZoom - startZoom) * e
      const offset = {
        x: startOffset.x + (targetOffset.x - startOffset.x) * e,
        y: startOffset.y + (targetOffset.y - startOffset.y) * e,
      }
      zoomRef.current = zoom
      offsetRef.current = offset
      setViewport({ zoom, offset })
      animFrameRef.current = progress < 1 ? window.requestAnimationFrame(step) : null
    }
    animFrameRef.current = window.requestAnimationFrame(step)
  }, [cancelAnim, offsetRef, setViewport, zoomRef])

  const zoomAtStagePoint = React.useCallback((nextZoom: number, point: { x: number; y: number }) => {
    const currentZoom = zoomRef.current || 1
    const currentOffset = offsetRef.current
    const zoomRatio = nextZoom / currentZoom
    setViewportTransform(nextZoom, {
      x: point.x - (point.x - currentOffset.x) * zoomRatio,
      y: point.y - (point.y - currentOffset.y) * zoomRatio,
    })
  }, [offsetRef, setViewportTransform, zoomRef])

  const finishPan = React.useCallback((pointerId?: number) => {
    resetPanState()
    if (offsetFrameRef.current !== null) {
      window.cancelAnimationFrame(offsetFrameRef.current)
      offsetFrameRef.current = null
    }
    if (pendingOffsetRef.current) {
      const pending = pendingOffsetRef.current
      setViewport((current) => ({ ...current, offset: pending }))
      pendingOffsetRef.current = null
    }
    const stage = stageRef.current
    if (
      stage && pointerId !== undefined &&
      typeof stage.hasPointerCapture === 'function' &&
      typeof stage.releasePointerCapture === 'function' &&
      stage.hasPointerCapture(pointerId)
    ) {
      stage.releasePointerCapture(pointerId)
    }
  }, [resetPanState, setViewport, stageRef])

  React.useEffect(() => () => {
    if (offsetFrameRef.current !== null) {
      window.cancelAnimationFrame(offsetFrameRef.current)
      offsetFrameRef.current = null
    }
    if (animFrameRef.current !== null) {
      window.cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const handlePointerUp = (event: PointerEvent) => {
      activePointerButtonsRef.current = event.buttons
      if (event.buttons === 0) lastPointerPositionRef.current = null
    }
    const handlePointerCancel = () => {
      activePointerButtonsRef.current = 0
      lastPointerPositionRef.current = null
    }
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
    }
  }, [])

  // 空格按住 = 平移模式（光标 grab）。输入框/可编辑区放行，别抢空格输入。
  // 它不是「滚轮方案的一部分」，是正交的第四个平移入口：光标压在**节点上**时，除中键/右键外
  // 只有它能平移（空白左键拖此时会被节点接走）。故两档共用、不进设置。
  React.useEffect(() => {
    if (readOnly) return undefined
    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement && Boolean(target.closest(
        'input, textarea, select, button, a[href], [contenteditable="true"], [role="button"], [role="menuitem"], .ProseMirror',
      ))
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      if (isInteractiveTarget(event.target) && activePointerButtonsRef.current === 0) return
      if (!stageRef.current || stageRef.current.offsetParent === null) return
      if (!spaceHeldRef.current) {
        spaceHeldRef.current = true
        setIsSpaceHeld(true)
      }
      event.preventDefault() // 否则空格会滚页 / 触发按钮
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      releaseSpace()
      if (panStartRef.current?.button === 0) finishPan(panStartRef.current.pointerId)
    }
    const handleBlur = () => {
      releaseSpace()
      suppressContextMenuRef.current = false
      activePointerButtonsRef.current = 0
      if (panStartRef.current) finishPan(panStartRef.current.pointerId)
      else resetPanState()
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur) // 切走窗口时松开，否则回来还卡在平移态
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [finishPan, readOnly, releaseSpace, resetPanState, stageRef])

  const beginPan = React.useCallback((
    event: React.PointerEvent<HTMLDivElement>,
    button: 0 | 1 | 2,
    startPoint?: { clientX: number; clientY: number },
  ) => {
    setContextNodeMenu(null)
    setActiveEdge(null)
    suppressContextMenuRef.current = false
    isPanningRef.current = true
    setIsPanning(true)
    panStartRef.current = {
      pointerId: event.pointerId,
      clientX: startPoint?.clientX ?? event.clientX,
      clientY: startPoint?.clientY ?? event.clientY,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
      button,
      moved: false,
    }
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* 无活动指针时忽略 */ }
  }, [offsetRef, setActiveEdge, setContextNodeMenu])

  // 捕获阶段：空格/中键/右键拖在节点之上也能平移（抢在节点 pointerdown 前）。
  const handlePointerDownCapture = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointerButtonsRef.current = event.buttons
    lastPointerPositionRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY }
    const action = resolveCanvasPointerDownAction({
      button: event.button,
      spaceHeld: spaceHeldRef.current,
      interactiveTarget: false,
      readOnly,
    })
    if (action === 'pan') {
      if (shouldPreventDefaultForCanvasPanStart(event.button)) event.preventDefault()
      event.stopPropagation()
      beginPan(event, event.button as 0 | 1 | 2)
      return
    }
    if (event.button === 0) setContextNodeMenu(null)
    // 只有真空白处才收起激活边。边菜单也在 stage 里，而这是 capture 阶段：
    // 子按钮的 stopPropagation 来不及拦。若不在此豁免，pointerdown 会先卸载菜单，
    // 后续 click 无目标，表现为“改标签 / 断开都没反应”。
    if (!activeEdgeId) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('.generation-canvas-v2__edge-hit, .generation-canvas-v2__edge-cut, .generation-canvas-v2__edge-control, [role="menu"], [role="menuitem"], [role="menuitemradio"]')) return
    setActiveEdge(null)
  }, [activeEdgeId, beginPan, readOnly, setActiveEdge, setContextNodeMenu])

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointerButtonsRef.current = event.buttons
    const previousPoint = lastPointerPositionRef.current
    lastPointerPositionRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY }
    if (
      isPanningRef.current && panStartRef.current &&
      !isCanvasPanButtonHeld(panStartRef.current.button, {
        buttons: event.buttons,
        spaceHeld: spaceHeldRef.current,
      })
    ) {
      finishPan(event.pointerId)
      return false
    }
    if (!isPanningRef.current) {
      const panButton = resolveCanvasPanButtonFromMove({ buttons: event.buttons, spaceHeld: spaceHeldRef.current })
      if (panButton === null) return false
      beginPan(
        event,
        panButton,
        previousPoint?.pointerId === event.pointerId ? previousPoint : undefined,
      )
    }
    if (!panStartRef.current) return false
    const start = panStartRef.current
    if (!start.moved) {
      const exceededThreshold = canvasDragExceededThreshold(start.clientX, start.clientY, event.clientX, event.clientY)
      if (!exceededThreshold && start.button === 2) return true
      if (exceededThreshold) {
        start.moved = true
        if (start.button === 2) suppressContextMenuRef.current = true // 右键拖→吞菜单
      }
    }
    scheduleOffset({
      x: start.offsetX + (event.clientX - start.clientX),
      y: start.offsetY + (event.clientY - start.clientY),
    })
    return true
  }, [beginPan, finishPan, scheduleOffset])

  const handlePointerUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointerButtonsRef.current = event.buttons
    lastPointerPositionRef.current = null
    if (!isPanningRef.current) return
    // document 级连线监听器会在 React stage handler 之后收到同一个 native pointerup。
    // 只标记会冲突的 Space+左键；右键必须保留默认 contextmenu 派发。
    if (event.button === 0) event.preventDefault()
    finishPan(event.pointerId)
  }, [finishPan])

  const handlePointerCancel = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointerButtonsRef.current = 0
    suppressContextMenuRef.current = false
    if (isPanningRef.current) finishPan(event.pointerId)
    else lastPointerPositionRef.current = null
  }, [finishPan])

  const shouldSuppressContextMenu = React.useCallback(() => {
    if (suppressContextMenuRef.current) {
      suppressContextMenuRef.current = false
      return true
    }
    return false
  }, [])

  // 滚轮 / 触控板：缩放还是平移由用户设置决定（#832 二选一）；⌘/Ctrl+滚轮与捏合恒缩放。
  const handleWheel = React.useCallback((event: WheelEvent) => {
    // 命中卡内可滚区（提示词编辑器等）→ 交原生滚动，画布不动（一处覆盖所有入口，P2）。
    // 捏合/⌘+滚轮（ctrlKey/metaKey）不放行——浏览器此时本来就不滚内容，仍走缩放。
    // 主轴判定在 findScrollableAncestor 内做（横/纵都支持），不在此处折成单轴 delta。
    if (
      !event.ctrlKey && !event.metaKey &&
      event.target instanceof Element &&
      findScrollableAncestor(event.target, stageRef.current, event.deltaX, event.deltaY)
    ) return
    event.preventDefault()
    setContextNodeMenu(null)
    if (resolveWheelIntent(gestureScheme, event) === 'pan') {
      // Shift+滚轮：把纵向滚动当横向（鼠标无横轴时的水平平移）
      const panX = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX
      const panY = event.shiftKey && event.deltaX === 0 ? 0 : event.deltaY
      scheduleOffset({ x: offsetRef.current.x - panX, y: offsetRef.current.y - panY })
      return
    }
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const nextZoom = clampNumber(zoomRef.current * getWheelZoomFactor(event), 0.2, 3)
    zoomAtStagePoint(nextZoom, { x: event.clientX - rect.left, y: event.clientY - rect.top })
  }, [gestureScheme, offsetRef, scheduleOffset, setContextNodeMenu, stageRef, zoomAtStagePoint, zoomRef])

  React.useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    stage.addEventListener('wheel', handleWheel, { passive: false })
    return () => stage.removeEventListener('wheel', handleWheel)
  }, [handleWheel, stageRef])

  return {
    isPanning,
    isSpaceHeld,
    scheduleOffset,
    setViewportTransform,
    animateViewportTo,
    zoomAtStagePoint,
    handlePointerDownCapture,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    shouldSuppressContextMenu,
  }
}
