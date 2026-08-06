export const CANVAS_DRAG_THRESHOLD = 4

export type CanvasPointerDownAction = 'pan' | 'marquee' | 'ignore'

type CanvasPointerDownInput = {
  button: number
  spaceHeld: boolean
  interactiveTarget: boolean
  readOnly: boolean
}

export function resolveCanvasPointerDownAction(input: CanvasPointerDownInput): CanvasPointerDownAction {
  if (input.spaceHeld || input.button === 1 || input.button === 2) return 'pan'
  if (input.button !== 0 || input.interactiveTarget || input.readOnly) return 'ignore'
  return 'marquee'
}

export function resolveCanvasPanButtonFromMove(input: {
  buttons: number
  spaceHeld: boolean
}): 0 | 1 | 2 | null {
  if ((input.buttons & 2) !== 0) return 2
  if ((input.buttons & 4) !== 0) return 1
  if (input.spaceHeld && (input.buttons & 1) !== 0) return 0
  return null
}

export function isCanvasPanButtonHeld(
  button: 0 | 1 | 2,
  input: { buttons: number; spaceHeld: boolean },
): boolean {
  if (button === 2) return (input.buttons & 2) !== 0
  if (button === 1) return (input.buttons & 4) !== 0
  return input.spaceHeld && (input.buttons & 1) !== 0
}

export function canvasDragExceededThreshold(startX: number, startY: number, x: number, y: number): boolean {
  return Math.abs(x - startX) >= CANVAS_DRAG_THRESHOLD || Math.abs(y - startY) >= CANVAS_DRAG_THRESHOLD
}

export function shouldFinishCanvasConnection(button: number, pointerUpConsumed = false): boolean {
  return button === 0 && !pointerUpConsumed
}

export function shouldPreventDefaultForCanvasPanStart(button: number): boolean {
  return button !== 2
}

export function isMacCanvasPlatform(platform: string): boolean {
  return /(Mac|iPhone|iPad|iPod)/i.test(platform)
}

export function isCanvasContextMenuPointer(button: number, ctrlKey: boolean, platform: string): boolean {
  return button === 2 || (button === 0 && ctrlKey && isMacCanvasPlatform(platform))
}
