# Nomi 国际宣传片制作追踪

更新时间：2026-08-01  
状态：Task 3 双语脚本与逐镜来源锁定

## ChatCut 项目

- 项目：`Nomi International Launch Film`
- Project ID：`e972cb0b-b0bf-4c14-98ab-25093c2d0475`
- 初始 Timeline ID：`c995e3a0-b174-4736-b7aa-e86b3aa72b58`
- 画布：1920×1080，30 fps
- 编辑器：<https://app.chatcut.io/zh/editor/e972cb0b-b0bf-4c14-98ab-25093c2d0475>

## 素材溯源

| 角色 | ChatCut Asset ID | 来源 | 导入方式 | 媒体事实 | 状态 |
|---|---|---|---|---|---|
| 原始完整录屏 | `68fc31c8-ca76-4448-bbe6-d51439a33680` | `/Users/aoqimin/Documents/FocuSee/Nomi 2026-07-30 02-25-31.mp4` | ChatCut import helper | 原文件 3444×2160，H.264 + AAC，30 fps，705.236 s；导入时因宽度超过 1920 转码为 1920×1204，705.267 s，264,019,450 bytes；音频 -23.4 LUFS | 上传 `ready`；转写 `complete` |
| 官网演示片 | `f8f0e4d0-d83d-4dc0-a407-af2046682264` | `/Users/aoqimin/Desktop/Nomi/marketing/assets/demo.mp4` | ChatCut import helper | 1280×720，46.6 s，无音轨，4,542,583 bytes | 上传 `ready`；无音轨无需转写 |
| 3D 导演台静帧 | `5d912025-0b7e-42f4-911b-01785334fdc3` | `/Users/aoqimin/Desktop/Nomi/marketing/assets/screen-3d.png` | ChatCut import helper | 1600×943，422,757 bytes | 上传 `ready` |
| Nomi 标志 | `56dbccec-435a-4b63-be51-10435e3db108` | `/Users/aoqimin/Desktop/Nomi/marketing/assets/nomi-logo.svg` | ChatCut import helper | SVG，512×512，399 bytes | 上传 `ready` |

## 导入验证

- `browse_assets`：4 项素材均在 `Master` 文件夹，名称与原文件一致。
- `track_progress target=upload`：完整录屏 `ready`，`progress=1`，终态成功。
- `track_progress target=transcription`：完整录屏 `complete`，状态为 `Transcript ready`。
- 完整录屏上传期间发生一次 CloudFront 502 与分片超时；helper 自动重试成功，没有重复注册资产。
- 生成/剪辑将引用原始资产与 source offset；不创建本地预剪扁平视频。

## 当前质量边界

- 原始口播只作为事实与时间点参考，成片主旁白另写。
- 禁用录屏原声，避免重复口头语、等待说明、报错与供应商故障进入成片。
- 明确排除 09:55–10:06 的供应商不稳定段落。
- 10:36–11:05 时间线段仅在画面干净时使用，否则改用官网演示片或现有时间线静帧。

## 后续记录区

### 视觉系统

- Design Style：`Nomi · Warm Editorial`（ID `80f6721729`）
- 色彩：背景 `#F3EEE6`、正文 `#292522`、强调 `#E7795F`、辅助 `#EFA95A`、深色画框 `#242425`
- 字体：标题 `Fraunces`、正文 `DM Sans`；两者均已通过 ChatCut 云字体目录精确匹配。
- 风格边界：温暖的编辑感、克制、触感明确、精确而有人味；生成或剪辑不得退化成霓虹赛博、模板化科技蓝或过量玻璃拟态。
- 中文主时间线：`01-CN-Master-16x9`（ID `c995e3a0-b174-4736-b7aa-e86b3aa72b58`），1920×1080，30 fps。
- 视频轨道：V1 `e8db59d6d2`（产品画面）、V2 `2fe6d015ee`（信息层）、V3 `da846dcdfe`（品牌动效与字幕）。
- 音频轨道：A1 `df9b16d005`（Narration，`anchor`）、A2 `70b06c9d4d`（Music，`follower`）、A3 `1c1ac66b47`（SFX）。
- 结构复核：ChatCut `read_project` 与 `edit_track list` 均返回 3 条视频轨、3 条音频轨，当前时间线无遗留条目；A1/A2 的自动闪避角色正确。

### 脚本与镜头

- 成片脚本：docs/marketing/2026-08-01-nomi-launch-film-scripts.md
- 中文母版：8 个语义段，保留“摩擦 → 控制 → 证据 → 结果 → 行动”的单线结构。
- 英文适配：按英语自然表达重写，不逐字翻译；与中文共享同一产品事实和 CTA 边界。
- 真实素材取样已完成本地逐帧接触表检查：脚本/助手、视觉锚点、画布、浏览器采集、反推复用、集成面板与时间线均有干净源范围。
- 35–43 秒拆为两个 4 秒真实片段：07:00–07:04 证明“采集”，08:06–08:10 证明“反推并复用”；不以单一远景替代两项证据。
- Hook 与 CTA 的 V1 底片来自现有 demo.mp4 真实作品画面，后续由品牌 Motion Graphic 覆盖；不存在用 AI 概念片伪装产品能力。
- 明确禁用原录屏 09:55–10:06 的供应商不稳定段，以及 10:42 后任何可见生成失败画面。
- 宣称审计通过：无“最好 / 领先 / 全部模型 / 所有供应商 / any model / all models”等绝对化表述。

### 时间线与截图校对

尚未执行。

### 音频、字幕与导出

尚未执行。
