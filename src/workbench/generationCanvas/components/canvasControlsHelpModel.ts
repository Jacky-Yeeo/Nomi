import type { CanvasGestureScheme } from './canvasGesturePreference'
import { isMacCanvasPlatform } from './canvasPointerGestureModel'

export type CanvasControlsHelpSectionId = 'selection' | 'pan' | 'zoom' | 'node'

export type CanvasControlsHelpRow = {
  shortcutKey: string
  actionKey: string
  shortcutValues?: { mod: '⌘' | 'Ctrl' }
}

export type CanvasControlsHelpSection = {
  id: CanvasControlsHelpSectionId
  rows: CanvasControlsHelpRow[]
}

function platformModifier(platform: string): '⌘' | 'Ctrl' {
  return isMacCanvasPlatform(platform) ? '⌘' : 'Ctrl'
}

export function canvasControlsHelpSections(
  scheme: CanvasGestureScheme,
  platform: string,
): CanvasControlsHelpSection[] {
  const shortcutValues = { mod: platformModifier(platform) }
  const panRows: CanvasControlsHelpRow[] = [
    { shortcutKey: 'spaceDrag', actionKey: 'pan' },
    { shortcutKey: 'middleOrRightDrag', actionKey: 'pan' },
  ]
  if (scheme === 'modifier-zoom') {
    panRows.push({ shortcutKey: 'wheelOrTwoFinger', actionKey: 'pan' })
  }

  return [
    {
      id: 'selection',
      rows: [
        { shortcutKey: 'blankDrag', actionKey: 'boxSelect' },
        { shortcutKey: 'shiftDrag', actionKey: 'addBoxSelect' },
        { shortcutKey: 'shiftClick', actionKey: 'toggleSelection' },
      ],
    },
    { id: 'pan', rows: panRows },
    {
      id: 'zoom',
      rows: scheme === 'wheel-zoom'
        ? [
            { shortcutKey: 'wheel', actionKey: 'zoom' },
            { shortcutKey: 'pinch', actionKey: 'zoom' },
          ]
        : [
            { shortcutKey: 'modWheel', actionKey: 'zoom', shortcutValues },
            { shortcutKey: 'pinch', actionKey: 'zoom' },
          ],
    },
    {
      id: 'node',
      rows: [
        { shortcutKey: 'modA', actionKey: 'selectAll', shortcutValues },
        { shortcutKey: 'modCopyPaste', actionKey: 'copyPaste', shortcutValues },
        { shortcutKey: 'delete', actionKey: 'deleteSelection' },
        { shortcutKey: 'escape', actionKey: 'cancel' },
      ],
    },
  ]
}
