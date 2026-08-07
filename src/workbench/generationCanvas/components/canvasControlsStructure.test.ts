import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function source(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')
}

describe('generation canvas control structure', () => {
  it('keeps viewport panning independent from connection cancellation', () => {
    const viewportGestures = source('./useCanvasViewportGestures.ts')

    expect(viewportGestures).not.toContain('cancelConnection')
    expect(viewportGestures).not.toContain('pendingConnectionSourceId')
  })

  it('only completes drag-to-connect from a primary pointer-up', () => {
    const dragToConnect = source('./useDragToConnect.ts')
    const viewportGestures = source('./useCanvasViewportGestures.ts')

    expect(dragToConnect).toContain('shouldFinishCanvasConnection(event.button, event.defaultPrevented)')
    expect(viewportGestures).toContain('resolveCanvasPanButtonFromMove')
    expect(viewportGestures).toContain('isCanvasPanButtonHeld')
    expect(viewportGestures).toContain("panStartRef.current?.button === 0")
    expect(viewportGestures).toMatch(
      /const handlePointerUp[\s\S]*?if \(!isPanningRef\.current\) return[\s\S]*?if \(event\.button === 0\) event\.preventDefault\(\)/,
    )
  })

  it('cleans both pan and marquee state on pointer cancellation', () => {
    const pointerInteractions = source('./useCanvasPointerInteractions.ts')
    const generationCanvas = source('./GenerationCanvas.tsx')

    expect(pointerInteractions).toContain('onPointerCancel')
    expect(generationCanvas).toContain('onPointerCancel={pointer.onPointerCancel}')
  })

  it('replaces the persistent hint with one contextual help entry', () => {
    const generationCanvas = source('./GenerationCanvas.tsx')
    const navigationStack = source('./CanvasNavigationStack.tsx')
    const onboardingState = source('../../onboarding/onboardingState.ts')
    const canvasStyles = source('../styles/generationCanvas.css')

    expect(generationCanvas).not.toContain('CanvasGestureHint')
    expect(navigationStack).toContain('<CanvasControlsHelpPopover />')
    expect(onboardingState).not.toContain('CANVAS_GESTURE_HINT_KEY')
    expect(canvasStyles).not.toContain('generation-canvas-v2__gesture-hint')
  })

  it('keeps settings copy aligned with blank-drag marquee selection', () => {
    const settings = source('../../../i18n/locales/settings.ts')

    expect(settings).not.toContain('空白处按住拖都是平移、Shift+拖都是框选')
    expect(settings).not.toContain('dragging empty space always pans and Shift+drag always box-selects')
    expect(settings).toContain('空白处左键拖动直接框选')
    expect(settings).toContain('left-drag empty space directly box-selects')
  })

  it('keeps Space available to focused controls and gives disabled tooltip triggers a name', () => {
    const viewportGestures = source('./useCanvasViewportGestures.ts')
    const tooltipButton = source('./CanvasNavigationTooltipButton.tsx')

    expect(viewportGestures).toContain('input, textarea, select, button, a[href]')
    expect(viewportGestures).toContain('isInteractiveTarget(event.target) && activePointerButtonsRef.current === 0')
    expect(tooltipButton).toContain('aria-disabled={disabled || undefined}')
    expect(tooltipButton).not.toContain('tabIndex={disabled ? 0 : undefined}')
  })

  it('defers the blank-canvas menu without swallowing native menus inside controls', () => {
    const generationCanvas = source('./GenerationCanvas.tsx')
    const contextMenu = source('./useCanvasContextNodeMenu.ts')

    expect(contextMenu).toContain('isCanvasContextMenuPointer(event.button, event.ctrlKey, navigator.platform)')
    expect(contextMenu).toContain('if (!contextMenuPointer || pendingConnectionSourceId) return false')
    expect(contextMenu).toContain('return event.button === 0')
    expect(contextMenu).toContain('if (!suppressMenu && pendingMenuRef.current)')
    expect(contextMenu).toContain(
      'if (!pending && !suppressNextContextMenuRef.current && !active?.suppressContextMenu) return',
    )
    expect(contextMenu).toContain('pending.contextMenuSeen = true')
    expect(contextMenu).toContain(
      'if (activeContextPointerRef.current) activeContextPointerRef.current.contextMenuSeen = true',
    )
    expect(contextMenu).toContain('suppressMenu && !activeContextPointerRef.current?.contextMenuSeen')
    expect(contextMenu).toContain('const secondaryChord = (event.buttons & 3) === 3')
    expect(contextMenu).toContain('active.suppressContextMenu = true')
    expect(contextMenu).toContain('!active?.suppressContextMenu')
    expect(contextMenu).toContain('event.preventDefault()')
    expect(generationCanvas).toContain(
      'finishContextMenuPointerUp(event, event.button === 2 && pointer.shouldSuppressContextMenu())',
    )
  })

  it('cancels marquee when an explicit pan chord takes ownership after primary down', () => {
    const pointerInteractions = source('./useCanvasPointerInteractions.ts')

    expect(pointerInteractions).toContain('const panOwnsPointer = gestures.handlePointerMove(event)')
    expect(pointerInteractions).toContain('marquee.cancel()')
  })

  it('routes every icon-only navigation action through a styled tooltip component', () => {
    const navigationStack = source('./CanvasNavigationStack.tsx')
    const tooltipButtons = navigationStack.match(/<CanvasNavigationTooltipButton/g) ?? []

    expect(tooltipButtons).toHaveLength(4)
    expect(navigationStack).not.toContain('title=')
  })

  it('keeps the keyboard icon available through the runtime Tabler allowlist', () => {
    const tablerIcons = source('../../../vendor/tablerIcons.ts')

    expect(tablerIcons).toContain(
      "export { default as IconKeyboard } from '@tabler/icons-react/dist/esm/icons/IconKeyboard.mjs'",
    )
  })

  it('keeps help actions and keycaps legible in the two-column panel', () => {
    const helpPopover = source('./CanvasControlsHelpPopover.tsx')

    // 布局断言随 2026-08-08 溢出修复更新：w-96 → w-[30rem]（长 kbd 如「Delete / Backspace」
    // 在 174px 列宽下必溢出右缘）、right-0 → left-1/2 -translate-x-1/2（居中防左右遮挡）。
    expect(helpPopover).toContain("'absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-[12] w-[30rem] p-3'")
    expect(helpPopover).toContain('text-caption whitespace-nowrap text-nomi-ink-60')
    expect(helpPopover).toContain('text-caption font-medium leading-none whitespace-nowrap text-nomi-ink')
  })
})
