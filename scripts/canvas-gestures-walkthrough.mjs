// R13 真机走查：画布操作语义翻转（2026-07-31 用户拍板，ComfyUI 式）。
// 验三件事：① 左键按住空白拖 = 平移（旧空格拖已删）；② 滚轮 = 缩放且锚在光标；
// ③ Shift+拖空白 = 框选、Shift+点节点 = 多选切换、纯点空白 = 清选区。
// 截图人眼判断 + 程序断言（节点位移/锚点漂移/选中数）双保险。
// 用法：node scripts/canvas-gestures-walkthrough.mjs
import { _electron as electron } from 'playwright'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, mkdtempSync } from 'node:fs'
import os from 'node:os'

const require = createRequire(import.meta.url)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(repoRoot, '.canvas-gestures-walk')
mkdirSync(outDir, { recursive: true })
const shot = async (win, name) => { await win.screenshot({ path: path.join(outDir, name) }); console.log('  📸 ' + name) }

const app = await electron.launch({
  executablePath: require('electron'),
  args: ['.'],
  cwd: repoRoot,
  env: {
    ...process.env,
    NOMI_E2E: '1',
    NOMI_E2E_ALLOW_MULTI_INSTANCE: '1',
    NOMI_SETTINGS_DIR: mkdtempSync(path.join(os.tmpdir(), 'canvas-gestures-settings-')),
    NOMI_PROJECTS_DIR: mkdtempSync(path.join(os.tmpdir(), 'canvas-gestures-proj-')),
  },
})
const errors = []
let failed = false
const check = (ok, label) => {
  console.log((ok ? '  ✓ ' : '  ✗ ') + label)
  if (!ok) failed = true
}

try {
  const win = await app.firstWindow()
  const bw = await app.browserWindow(win)
  await bw.evaluate((w) => w.setBounds({ x: 0, y: 0, width: 1680, height: 1020 })).catch(() => {})
  win.on('pageerror', (e) => errors.push(String(e)))
  win.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await win.waitForLoadState('domcontentloaded')
  await win.waitForTimeout(1500)

  await win.getByText('新建空白项目', { exact: false }).first().click()
  await win.waitForTimeout(2500)
  await win.locator('[aria-label="工作区切换"]').getByText('生成', { exact: true }).click()
  await win.waitForTimeout(1500)

  // 建 2 个图片节点（多选/框选素材）
  for (let i = 0; i < 2; i += 1) {
    await win.locator('[aria-label="添加图片节点"]').first().click()
    await win.waitForTimeout(600)
    await win.keyboard.press('Escape')
    await win.waitForTimeout(300)
  }
  const nodes = win.locator('.generation-canvas-v2-node')
  const nodeCount = await nodes.count()
  check(nodeCount === 2, `画布节点数 = ${nodeCount}（预期 2）`)
  await shot(win, '01-baseline.png')

  const stage = await win.locator('.generation-canvas-v2__stage').boundingBox()
  const nodeBoxA0 = await nodes.nth(0).boundingBox()
  const nodeBoxB0 = await nodes.nth(1).boundingBox()

  // ─── ① 左键按住空白拖 = 平移 ───
  // 空白点取节点联合包围盒左上外侧（避开顶部工具栏/手势提示：至少离 stage 顶 120px）
  const blankX = Math.max(stage.x + 40, Math.min(nodeBoxA0.x, nodeBoxB0.x) - 80)
  const blankY = Math.max(stage.y + 130, Math.min(nodeBoxA0.y, nodeBoxB0.y) - 60)
  await win.mouse.move(blankX, blankY)
  await win.mouse.down()
  await win.mouse.move(blankX + 240, blankY + 140, { steps: 8 })
  await shot(win, '02-pan-dragging.png')
  await win.mouse.up()
  await win.waitForTimeout(400)
  const nodeBoxA1 = await nodes.nth(0).boundingBox()
  const nodeBoxB1 = await nodes.nth(1).boundingBox()
  const dxA = nodeBoxA1.x - nodeBoxA0.x
  const dyA = nodeBoxA1.y - nodeBoxA0.y
  const dxB = nodeBoxB1.x - nodeBoxB0.x
  check(Math.abs(dxA - 240) < 8 && Math.abs(dyA - 140) < 8, `空白拖 → 画布平移（节点位移 ${Math.round(dxA)},${Math.round(dyA)} ≈ 240,140）`)
  check(Math.abs(dxB - 240) < 8, '两个节点同步位移（整体平移而非拖动了单节点）')
  await shot(win, '03-pan-done.png')

  // ─── ② 滚轮 = 缩放，锚在光标 ───
  // 锚点取节点 A 中心：缩放后该点应仍钉在光标下（漂移 < 12px）
  const anchorBox = await nodes.nth(0).boundingBox()
  const anchorX = anchorBox.x + anchorBox.width / 2
  const anchorY = anchorBox.y + anchorBox.height / 2
  await win.mouse.move(anchorX, anchorY)
  await win.mouse.wheel(0, -240) // 两档上滚 = 放大
  await win.waitForTimeout(500)
  const zoomedBox = await nodes.nth(0).boundingBox()
  const zoomRatio = zoomedBox.width / anchorBox.width
  const zoomedCenterX = zoomedBox.x + zoomedBox.width / 2
  const zoomedCenterY = zoomedBox.y + zoomedBox.height / 2
  const drift = Math.hypot(zoomedCenterX - anchorX, zoomedCenterY - anchorY)
  check(zoomRatio > 1.2, `滚轮上滚 → 放大（节点宽 ×${zoomRatio.toFixed(2)}）`)
  check(drift < 12, `缩放锚在光标（锚点漂移 ${drift.toFixed(1)}px < 12px）`)
  await shot(win, '04-wheel-zoom-in.png')
  await win.mouse.wheel(0, 240) // 滚回原倍率
  await win.waitForTimeout(500)
  const restoredBox = await nodes.nth(0).boundingBox()
  check(Math.abs(restoredBox.width / anchorBox.width - 1) < 0.05, '滚轮下滚 → 缩小（回到原倍率）')

  // ─── ③ Shift+拖 = 框选；Shift+点 = 多选切换；纯点空白 = 清选区 ───
  const boxA = await nodes.nth(0).boundingBox()
  const boxB = await nodes.nth(1).boundingBox()
  const unionLeft = Math.min(boxA.x, boxB.x)
  const unionTop = Math.min(boxA.y, boxB.y)
  const unionRight = Math.max(boxA.x + boxA.width, boxB.x + boxB.width)
  const unionBottom = Math.max(boxA.y + boxA.height, boxB.y + boxB.height)
  const marqueeFromX = Math.max(stage.x + 20, unionLeft - 50)
  const marqueeFromY = Math.max(stage.y + 130, unionTop - 50)
  await win.keyboard.down('Shift')
  await win.mouse.move(marqueeFromX, marqueeFromY)
  await win.mouse.down()
  await win.mouse.move(unionRight + 50, unionBottom + 50, { steps: 8 })
  const marqueeVisible = await win.locator('.generation-canvas-v2__marquee').count()
  check(marqueeVisible > 0, 'Shift+拖 → 画出框选矩形')
  await shot(win, '05-marquee-dragging.png')
  await win.mouse.up()
  await win.keyboard.up('Shift')
  await win.waitForTimeout(400)
  const selectedAfterMarquee = await win.locator('.generation-canvas-v2-node[data-selected="true"]').count()
  check(selectedAfterMarquee === 2, `框选罩住两节点 → 选中 ${selectedAfterMarquee}/2`)
  await shot(win, '06-marquee-selected.png')

  // 纯点空白 = 清选区（原框选路径让位后由平移路径接管，回归验证）
  await win.mouse.click(marqueeFromX, marqueeFromY)
  await win.waitForTimeout(400)
  const selectedAfterBlankClick = await win.locator('.generation-canvas-v2-node[data-selected="true"]').count()
  check(selectedAfterBlankClick === 0, '纯点空白 → 清空选区')

  // Shift+点选：A 单选 → Shift+点 B 追加 → Shift+再点 B 反选
  await nodes.nth(0).click({ position: { x: 20, y: 12 } })
  await win.waitForTimeout(300)
  await nodes.nth(1).click({ position: { x: 20, y: 12 }, modifiers: ['Shift'] })
  await win.waitForTimeout(300)
  const selectedAfterShiftClick = await win.locator('.generation-canvas-v2-node[data-selected="true"]').count()
  check(selectedAfterShiftClick === 2, `点选 A + Shift+点 B → 选中 ${selectedAfterShiftClick}/2`)
  await shot(win, '07-shift-click-multi.png')
  await nodes.nth(1).click({ position: { x: 20, y: 12 }, modifiers: ['Shift'] })
  await win.waitForTimeout(300)
  const selectedAfterToggle = await win.locator('.generation-canvas-v2-node[data-selected="true"]').count()
  check(selectedAfterToggle === 1, `Shift+再点 B → 反选回 ${selectedAfterToggle}/1`)
  await shot(win, '08-shift-click-toggle.png')
} catch (error) {
  failed = true
  console.error('  ✗ 走查中断: ' + (error instanceof Error ? error.message : String(error)))
} finally {
  if (errors.length) {
    console.log('  ⚠ 渲染进程报错 ' + errors.length + ' 条：')
    for (const line of errors.slice(0, 5)) console.log('    ' + line)
  }
  await app.close().catch(() => {})
}
console.log(failed ? '\n✗ 画布手势走查未通过' : '\n✓ 画布手势走查通过')
process.exit(failed ? 1 : 0)
