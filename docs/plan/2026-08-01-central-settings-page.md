# 集中设置页 + 自动另存（首批项）· 2026-08-01

> 来源：微信反馈（YAOYU168 反复提「自动保存本地 / 路径自定义」+ 图4 AI-CanvasPro 的「文件与保存」设置页）。
> 用户拍板（2026-08-01）：**做一个集中设置页**（不是顶栏小面板），自动另存作为首批项。
> 样张已出（left tab + right content，文件与保存含自动另存开关默认关）。

## 用户看到的变化

项目库顶栏加一个「设置」齿轮入口 → 点开**集中设置页**（左 tab 右内容，像图4）。首批「文件与保存」tab：
- 「自动另存生成物」开关，**默认关**
- 开启后「另存到」目录可选；此后每张生成的图/视频完成时，自动复制一份到该目录
- 「保存根目录」先占位（标「大改·稍后支持」）

## 为什么这么做（底层逻辑）

- **真实摩擦**：用户不想每张手动下载（YAOYU168 多次提）。刚做过「记住上次另存目录」，自动另存是自然延伸。
- **结构**：Nomi 一直没有集中设置页（设置散落各处）。建一个集中设置页当「设置的家」，自动另存是首批，将来保存根目录/字幕引擎/通用偏好都进这——一次搭好框架，后续项只往里加。
- **不造轮子**：复用现有 `OnboardingFloatingPanel`（`src/ui/onboarding/`）的外壳交互（Portal + Esc + 点外关 + pop 动画），布局改成图4 的左 tab 右内容。

## 分层实现

| 层 | 改动 | 说明 |
|---|---|---|
| UI | 新 `src/workbench/settings/SettingsDialog.tsx` | 左 tab 侧栏 + 右内容区；复用 OnboardingFloatingPanel 外壳模式。入口=项目库顶栏齿轮（`ProjectLibraryPage` 顶栏那排 + `NomiStudioApp` state） |
| 持久化 | 扩展 `electron/assets/downloadPrefs.ts` | `download-prefs.json` 加 `autoSaveEnabled` + `autoSaveDir`（和现有 `lastDir` 同文件，零迁移） |
| runtime | 自动另存复制逻辑 | 生成完成（`generationRunController:207 addNodeResult`）时，若开启，复用 `downloadAssetToDisk` 的取字节逻辑，静默复制到 `autoSaveDir`（**不弹对话框**）；失败不打断生成（best-effort + toast） |
| i18n | 设置页文案 zh+en | 复用 `assetLibrary`/新 `settings` 命名空间 |

## 不动项（never-wipe / D2）

- **不改 Nomi 项目存储根路径**——「保存根目录」是后续大改（要迁移现有数据），本轮只占位。
- 自动另存**只加复制**，不动内部 `nomi-local` 存储（零数据风险）。
- 不做竞品能力堆（人脸检测/控制角度/宫格，用户已拍不做）。

## 首批范围（进度）

1. ✅ **持久化**（`electron/assets/downloadPrefs.ts`）：merge 写 + `getAutoSavePrefs`/`setAutoSavePrefs`（默认关）
2. ✅ **runtime**（`electron/assets/autoSaveAsset.ts`）：`autoSaveAssetToDisk` 复用抽出的 `fetchAssetBytes`；best-effort（关/失败不打断生成）+ 同名不覆盖（-1/-2）。**9 单测过**
3. ⬜ **IPC**：`nomi:assets:auto-save`（生成完成调）+ `nomi:settings:auto-save-get/set` + 目录选择（showOpenDialog）→ main.ts/preload/bridge
4. ⬜ **UI** `src/workbench/settings/SettingsDialog.tsx`：左 tab 右内容（照已拍板样张）+ 顶栏齿轮入口（`ProjectLibraryPage`+`NomiStudioApp`）
5. ⬜ **接线**：生成完成（`generationRunController:207 addNodeResult`）后调 auto-save IPC
6. ⬜ **i18n** + **走查**：开设置→开自动另存→选目录→生成→亲眼看目录里出现副本

> 下轮从 ③ 起：IPC→UI→接线→走查，一轮做完 UI 层完整交付。地基（①②）已测过、五门过。

## 验收门

- 五门全过 + 真机走查（亲眼看副本落盘）
- 复制失败不影响生成（best-effort）
- never-wipe：只加副本，内部存储不动

## 后续（不在本轮，各自单独排）

- 保存根目录（改存储根 + 数据迁移，大改，单独 plan + 样张）
- 通用 / 关于 tab 内容
- 字幕识别引擎设置（图4 有，音频工作台成熟后）
