# Nomi 国际宣传片制作追踪

更新时间：2026-08-01  
状态：Task 1 素材导入完成

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

尚未执行。

### 脚本与镜头

尚未执行。

### 时间线与截图校对

尚未执行。

### 音频、字幕与导出

尚未执行。
