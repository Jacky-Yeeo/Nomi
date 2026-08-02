// R13 走查 —— 组端口 + 整组运行（SHUO backlog 第 2 项）。
// 用法: node tests/ux/group-ports.walk.mjs   产出: tests/ux/shots/group-ports/*.png
//
// 验的是**用户真会做的那串动作**：编组 → 组标签上点运行 → 从一个节点拉线 → 落到组框上 → 组内每个成员各得一根边。
// 断言不只看 DOM 有没有：边数、组框高亮的 computed 颜色、按钮几何（会不会把标签挤爆）都对账。
import { _electron as electron } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const shotsDir = path.join(repoRoot, 'tests/ux/shots/group-ports')
fs.rmSync(shotsDir, { recursive: true, force: true })
fs.mkdirSync(shotsDir, { recursive: true })
const userData = path.join(repoRoot, '.tmp', 'nomi-groupports-userdata')
fs.rmSync(userData, { recursive: true, force: true })
fs.mkdirSync(userData, { recursive: true })

let n = 0
const fail = []
function check(name, ok, detail) {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) fail.push(`${name}${detail ? ` — ${detail}` : ''}`)
}
async function snap(win, name, clip) {
  n += 1
  await win.screenshot({ path: path.join(shotsDir, `${String(n).padStart(2, '0')}-${name}.png`), ...(clip ? { clip } : {}) })
  console.log(`  · shot ${String(n).padStart(2, '0')}-${name}`)
}
async function snapNear(win, name, locator, pad = 30) {
  const box = await locator.boundingBox().catch(() => null)
  if (!box) { console.error(`  ⚠️ ${name} 没盒子`); return null }
  await snap(win, name, {
    x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
    width: Math.min(1200, box.width + pad * 2), height: Math.min(800, box.height + pad * 2),
  })
  return box
}

const app = await electron.launch({
  executablePath: require('electron'),
  args: ['.', `--user-data-dir=${userData}`, '--no-proxy-server'],
  cwd: repoRoot,
  env: { ...process.env, NOMI_E2E: '1', NOMI_E2E_ALLOW_MULTI_INSTANCE: '1' },
})
const win = await app.firstWindow()
await win.waitForLoadState('domcontentloaded')
await win.evaluate(() => {
  window.localStorage.setItem('__nomiE2E', '1')
  for (const k of ['nomi:splash:v1', 'nomi:journey-tour:v1', 'nomi:canvas-gesture-hint:v1']) {
    window.localStorage.setItem(k, 'seen')
  }
})
await win.reload()
await win.waitForLoadState('domcontentloaded')
await win.waitForTimeout(2200)
for (const label of ['新建空白项目', '开始一个项目']) {
  const el = win.locator('button', { hasText: label }).first()
  if (await el.count()) { await el.click({ timeout: 4000 }).catch(() => {}); break }
}
await win.waitForTimeout(2500)
const genTab = win.locator('button', { hasText: /^生成$/ }).first()
if (await genTab.count()) await genTab.click({ timeout: 5000 }).catch(() => {})
await win.waitForTimeout(2500)

const addImage = win.locator('[aria-label="添加图片节点"]').first()
if (!(await addImage.count())) { console.error('❌ 找不到「添加图片节点」'); await app.close(); process.exit(1) }
for (let i = 0; i < 4; i += 1) { await addImage.click({ timeout: 4000 }); await win.waitForTimeout(300) }
await win.waitForTimeout(900)

const nodeIds = await win.evaluate(() =>
  Array.from(document.querySelectorAll('[data-node-id]')).map((el) => el.getAttribute('data-node-id')).filter(Boolean))
console.log('  → 节点:', nodeIds.length)
if (nodeIds.length < 4) { console.error('❌ 节点不够'); await app.close(); process.exit(1) }

// ── 编组前 3 个：框选不好控，改用「全选后编组」再把第 4 个移出组太绕；
//    直接全选 4 个编成一组，第 4 个当连线源就用组外新加的第 5 个。
await win.keyboard.press('Control+a')
await win.waitForTimeout(500)
const groupBtn = win.locator('[aria-label^="创建分组"]').first()
if (!(await groupBtn.count())) { console.error('❌ 找不到「创建分组」'); await app.close(); process.exit(1) }
await groupBtn.click({ timeout: 4000 })
await win.waitForTimeout(1000)
await win.keyboard.press('Escape')
await win.waitForTimeout(400)
await snap(win, 'grouped')

// ① 组标签：运行钮在不在、标签有没有被挤爆
const label = win.locator('.generation-canvas-v2__group-box-label').first()
await snapNear(win, 'group-label-with-run', label, 14)
const runBtn = win.locator('[data-group-run]').first()
check('组标签上有运行钮', await runBtn.count() > 0)
const geo = await win.evaluate(() => {
  const el = document.querySelector('.generation-canvas-v2__group-box-label')
  const btn = document.querySelector('[data-group-run]')
  if (!el || !btn) return null
  const lb = el.getBoundingClientRect(); const bb = btn.getBoundingClientRect()
  const nameEl = el.querySelector('span')
  return {
    labelW: Math.round(lb.width), labelH: Math.round(lb.height),
    btnW: Math.round(bb.width), btnH: Math.round(bb.height),
    btnInside: bb.right <= lb.right + 0.5 && bb.left >= lb.left - 0.5 && bb.top >= lb.top - 0.5 && bb.bottom <= lb.bottom + 0.5,
    nameTruncated: nameEl ? nameEl.scrollWidth > nameEl.clientWidth + 1 : null,
  }
})
console.log('  → 标签几何:', JSON.stringify(geo))
check('运行钮在标签框内（没溢出）', Boolean(geo?.btnInside), JSON.stringify(geo))
check('运行钮点得到（≥14px）', (geo?.btnW ?? 0) >= 14 && (geo?.btnH ?? 0) >= 14)
check('组名没被运行钮挤到截断', geo?.nameTruncated === false)

// ② 整组运行：应当走**和「生成选中」同一条**批量链路 → 弹同一个消耗额度确认卡，且张数 = 组成员数。
//    （这正是「不另起第二条调度」的可见证据：确认卡/队列/取消全是现成那套。）
await runBtn.click({ timeout: 4000 })
await win.waitForTimeout(2500)
await snap(win, 'after-run-group')
const confirmCard = await win.evaluate(() => {
  const veil = document.querySelector('.fixed.inset-0.z-\\[3500\\]')
  return veil ? veil.textContent?.replace(/\s+/g, ' ').trim() ?? '' : null
})
console.log('  → 确认卡:', JSON.stringify(confirmCard))
check('整组运行走的是现成的批量确认卡（没另起一套）', typeof confirmCard === 'string' && /开始生成/.test(confirmCard), String(confirmCard))
check('确认卡张数 = 组成员数 4', /生成\s*4\s*张/.test(confirmCard || ''), String(confirmCard))

// 取消掉，别真花额度；后面还要接着验连线。
const cancelBtn = win.locator('button', { hasText: /^取消$/ }).first()
if (await cancelBtn.count()) await cancelBtn.click({ timeout: 4000 }).catch(() => {})
await win.waitForTimeout(1200)
const veilGone = await win.evaluate(() => !document.querySelector('.fixed.inset-0.z-\\[3500\\]'))
check('取消后确认卡收掉', veilGone)

// ③ 连到组：加一个组外节点 → 从它拉线 → 组框应变成可落点（虚线 + 加深底色）
await win.waitForTimeout(800)
await addImage.click({ timeout: 4000 })
await win.waitForTimeout(900)
const allIds = await win.evaluate(() =>
  Array.from(document.querySelectorAll('[data-node-id]')).map((el) => el.getAttribute('data-node-id')))
const srcId = allIds[allIds.length - 1]
console.log('  → 连线源:', srcId)
// 先「适应视图」：组框比视口还大时它的标签在视口外，截图就拍不到改动区（R13 眼见链第四问）。
const fitBtn = win.locator('[aria-label="适应视图"]').first()
if (await fitBtn.count()) { await fitBtn.click({ timeout: 4000 }).catch(() => {}); await win.waitForTimeout(1200) }
await win.locator(`[data-node-id="${srcId}"]`).first().click({ timeout: 4000 })
await win.waitForTimeout(800)
// 用**真手势**：从磁吸连接点按下 → 拖到组框空白处 → 松手。这条路走的是 pointerup（useDragToConnect），
// 和「点一下连接点再点目标」的 click 路是两条，必须两条都真的通（走查第一版就是漏了 pointerup 那条）。
const handle = win.locator(`[data-node-id="${srcId}"] [data-side="right"]`).first()
check('找得到连接点', await handle.count() > 0)
const hb = await handle.boundingBox()
const gbox0 = await win.locator('.generation-canvas-v2__group-box').first().boundingBox()
if (!hb || !gbox0) { console.error('❌ 连接点/组框没盒子'); await app.close(); process.exit(1) }
// 落点必须是**组框内、且没压着任何节点**的空白：压着节点是「连那一个」（节点优先，这是设计），
// 随手猜坐标会连成 1 根然后误判成 bug。这里扫一遍真实元素栈找一个真空白点。
const dropPoint = await win.evaluate((gb) => {
  const inside = (x, y) => {
    const stack = document.elementsFromPoint(x, y)
    return stack.some((el) => el.closest('[data-group-id]')) && !stack.some((el) => el.closest('[data-node-id]'))
  }
  for (let dy = 12; dy < gb.height - 8; dy += 10) {
    for (let dx = 12; dx < gb.width - 8; dx += 10) {
      const x = gb.x + dx; const y = gb.y + dy
      if (inside(x, y)) return { x, y }
    }
  }
  return null
}, gbox0)
check('组框内找得到不压节点的空白落点', Boolean(dropPoint), JSON.stringify(dropPoint))
if (!dropPoint) { await app.close(); process.exit(1) }
await win.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
await win.mouse.down()
await win.mouse.move(dropPoint.x, dropPoint.y, { steps: 12 })
await win.waitForTimeout(500)

const pendingStyle = await win.evaluate(() => {
  const box = document.querySelector('.generation-canvas-v2__group-box')
  if (!box) return null
  const cs = getComputedStyle(box)
  return { borderStyle: cs.borderStyle, bg: cs.backgroundColor, cursor: cs.cursor, aria: box.getAttribute('aria-label') }
})
console.log('  → 待连时组框:', JSON.stringify(pendingStyle))
check('有线待连时组框变成可落点（虚线边）', pendingStyle?.borderStyle === 'dashed', JSON.stringify(pendingStyle))
check('可落点时 aria 说清「连到哪、几个」', /连到/.test(pendingStyle?.aria || ''), pendingStyle?.aria)
// 组框比视口还大 → 整框裁出来看不清；改裁它左上角那块（标签 + 边框），字才认得出（R13 眼见链）。
{
  const gb = await win.locator('.generation-canvas-v2__group-box').first().boundingBox()
  if (gb) await snap(win, 'group-drop-target', { x: Math.max(0, gb.x - 12), y: Math.max(0, gb.y - 12), width: 420, height: 190 })
}

// ④ 松手落到组上 → 组内每个成员各一根边
const edgesBefore = await win.evaluate(() => document.querySelectorAll('.generation-canvas-v2__edge-path').length)
await win.mouse.up()
await win.waitForTimeout(1600)
const edgesAfter = await win.evaluate(() => document.querySelectorAll('.generation-canvas-v2__edge-path').length)
console.log(`  → 边数 ${edgesBefore} → ${edgesAfter}`)
check('连到组后组内 4 个成员各得一根边', edgesAfter - edgesBefore === 4, `实得 ${edgesAfter - edgesBefore}`)
await snap(win, 'after-connect-to-group')

const restored = await win.evaluate(() => {
  const box = document.querySelector('.generation-canvas-v2__group-box')
  return box ? getComputedStyle(box).borderStyle : null
})
check('连完组框恢复常态（不再是虚线）', restored !== 'dashed', String(restored))

await app.close()
console.log(fail.length ? `\n❌ ${fail.length} 条不达标:\n - ${fail.join('\n - ')}` : '\n✅ 全部达标')
process.exit(fail.length ? 1 : 0)
