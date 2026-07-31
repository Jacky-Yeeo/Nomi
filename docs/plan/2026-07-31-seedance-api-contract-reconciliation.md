# Seedance 2.0 接入契约对账（2026-07-31）

**来源**：用户提供的中转站《Seedance 2.0 平台交付与完整接口使用文档》（sd.dawnloadai.com，NewAPI + Seedance
Gateway）。这是该渠道的权威接入文档 —— 火山官网文档站是 JS 渲染的，WebFetch 抓回来是空页，抓不到原文
（见 memory `api-doc-fetch-fail-ask-dont-substitute`）。

**为什么写这份**：对账结论里最重要的一条是**「我们主动不接的东西」**。不记下来，下次审计会把它当成漏洞
重新捡起来，或者有人照着「文档里有、我们没有」的清单闷头补一遍。

---

## 一、两条输入通道 —— 我们只接了一条（有意为之）

`content[].image_url.url` 只有两种合法值：

| 通道 | 值 | 我们 |
|---|---|---|
| 直接甩 URL | 公网可达的 HTTPS 地址 | ✅ 已接（唯一在用） |
| 平台素材库 | `asset://<asset_id>` | ❌ **有意不接** |

`asset://` 要先走 Gateway（`:9444`，与视频 API 不同端口、同一枚 Token）：
建组 → 传素材（**输入仍是公网 HTTPS URL**）→ 轮询到 `Active` → 才拿到 `asset_id`。
真人素材还要额外先过 H5 活体认证拿 `group_id`。

**不接的三条理由**（2026-07-31 用户拍板「先只做 A 类，真人通道不碰」）：

1. **它救不了本机图。** 素材创建接口的 `URL` 字段同样要求「上游可访问的公网 HTTPS 文件地址」——
   素材库自己也要一个公网 URL。所以「本机图没有公网地址」这个问题（免费图床 litterbox/tmpfiles 挂了
   就断链）asset:// 一点忙都帮不上。
2. **它救不了 Nomi 的主场景。** 文档 8.3.4 明写素材「文件内容必须属于**已完成人脸认证的本人**」。
   Nomi 的主场景是 AI 原创角色跨镜一致 —— 虚构角色没有「本人」可以去做活体认证。
3. **剩下的收益不抵成本。** 去掉上面两条，asset:// 只剩「素材复用」，代价是每张参考图两次额外往返
   + 轮询等待。

**什么时候该回来重开这个决定**：出现「用自己/授权演员的脸做数字人口播」这类真实用户需求时。届时要做的是
整条 C 类（H5 活体认证 + 认证素材管理 UI），不是只补素材库。

> ⚠️ 已证伪的方向：一度以为「方舟原生 `image_url` 收 base64 data URL 就能内联本机图、彻底摆脱第三方
> 图床」。**文档否掉了** —— `url` 字段只列 HTTPS URL 和 `asset://`，没有 base64。别再往这个方向走。

---

## 二、字段逐项对账（文档 §6.3 / §6.5 vs 我们发的报文）

`electron/catalog/volcengineVideos.ts` + `src/config/modelArchetypes/seedanceVolcengine.ts`

| 文档字段 | 状态 | 备注 |
|---|---|---|
| `model` / `content` / `resolution` / `ratio` / `generate_audio` / `watermark` | ✅ | |
| `ratio` 七枚举（含 `adaptive`） | ✅ | 档案七个全有 |
| `duration` 4–15 | ✅ | 文档另有 `-1`（模型自定），**不做**：同族 apimart 档案也没有，加了就是新的不一致；且「自动时长」让用户既不知道出几秒也不知道花多少钱 |
| `role`: `first_frame` / `last_frame` / `reference_image` | ✅ | |
| `role`: `reference_video` / `reference_audio` | ✅ **本次补** | 以前图片带 role、参考视频/音频裸奔 |
| `seed`（-1..2^32-1） | ✅ **本次补** | 同族 apimart 档案早有；参数由模型身份决定与渠道无关 |
| `return_last_frame` → `content.last_frame_url` | ❌ **不做** | `electron/video/extractVideoFrame.ts` 的抽帧路已覆盖同一需求（视频尾帧接下一段首帧），加它是并行版（P1） |
| `callback_url` | ❌ 不做 | 我们轮询，桌面 App 没有公网回调地址 |
| `tools` / `safety_identifier` / `service_tier` / `execution_expires_after` | ❌ 不做 | 默认值即可；无真实需求 |
| 查询 `id` / `status` / `content.video_url` / `error.message` | ✅ | 映射全对 |
| status 六态（含 `cancelled` / `expired`） | ✅ | 5be39076 补的 cancelled |
| `duration` / `*_tokens` 兼容 `string \| number` | — | 我们不读 usage，不受影响 |

**存疑挂账**：档案 `resolution` 有 `4k`，本文档只列到 `1080p`（原文「以模型实际支持范围为准」）。
同族 apimart 档案同样有 4k，是从 kie 渠道核过的。档案是**模型身份级**的，不因单一渠道收窄（P4）。
真撞到再说。

---

## 三、错误语义

`InputImageSensitiveContentDetected.PrivacyInformation`（HTTP 400）= 方舟在生成前的**输入图人脸分类器**。
写实人像基本都会被拦，与是不是 AI 生成的无关。它不是参数错、不是限流、重试必然再撞。

分类与文案已在 [55d7c142](https://github.com/aqm857886159/Nomi/commit/55d7c142) 落地
（`input-image-blocked` 类 + 主动作「换个模型」）。文案**有意不提**「去做真人认证」——
Nomi 里没有这个功能，提了等于把用户支去别处（D1）。

---

## 四、没做完的验证（诚实标注）

R5 第 ④ 条要求「改完用一条真实生成 E2E 验闭环」。**本次没做到**：该中转站的 Token 不在任何一份
本地 catalog 里（dev catalog 最后修改于 2026-07-29，只有官方火山 `ark.cn-beijing.volces.com`）。

所以 `role: reference_video/reference_audio` 和 `seed` 两处是**文档实锤但未经真机验证**的改动。
拿到 Token 后要补跑：全能参考模式带 1 视频 + 1 音频 + seed 固定值，看是否正常受理、seed 是否原样回显。

服务探活（无需 Token，文档 §12）已做：
`8443/api/status` 返回 NewAPI 配置、`9444/healthz` 返回 `{"ok":true,"service":"seedance-gateway"}`。
