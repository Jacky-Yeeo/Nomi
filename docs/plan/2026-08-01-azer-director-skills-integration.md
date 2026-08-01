# 阿泽导演技能集成进 Nomi — 方案

> 2026-08-01。来源：阿泽导演台 forge v2.4.2（开源 github.com/feicaiclub/forge）。
> **授权**：用户 2026-08-01 已取得阿泽本人授权，可使用其技能内容。落地用 Nomi 自己的结构重整，不照搬 EP/S 目录 + DeepSeek 调优 + 手动生成工作流。

## 一句话目标

把阿泽 28 个电影级技能（21k 行方法论）整过来，做成 Nomi 原生能力：**既让 Nomi 拆镜头/写提示词的质量立刻变好（脑变强），又让 AI 能经 MCP 脊柱调用「脑（技能）+ 手（生产）」在画布上直接拼出可播初稿。**

## 核心架构：MCP 脊柱 = 手 + 脑

Nomi 已有「手」（MCP 生产工具：建节点/设提示词/生成/读画布，`electron/capabilityCore/mcpProtocol.ts`）。这次把「脑」（导演技能）挂到同一根 MCP 脊柱上。两个受众共用一套脑：

- **应用内 AI**（大多数用户的统一体验）：Nomi 自己的创作 AI 拉技能规划 → 调生产工具在画布真生成 → 用户全程不出 Nomi。
- **外部 MCP agent**（生态红利，几乎白送）：Claude Code/桌面等连上 Nomi，拉同一套技能驱动生成。

**为什么是 MCP 而不是把技能焊死在 UI**：技能上了脊柱，内外两头共用，写一次两头通（P4 通用第一）。符合 2026「Skills over MCP」标准方向（SEP-2076 / AgentSkills-MCP 渐进披露）。

## 技能清单 + 移植策略（28 个）

分三类落地：

| 类 | 阿泽技能 | 价值 | Nomi 落点 |
|---|---|---|---|
| **A 质量守卫（自动·无感）** | seedance-kling-capabilities（演时换算/硬软约束/污染词）、consistency（五维/状态表/handoff） | 治拆镜头低估、提示词抽象、跨镜漂移 | **折进** `workbench-storyboard-planner` skill + 新守卫逻辑 |
| **B 创作招式（用户选/AI 按需调）** | cinematography(+deakins)、storyboard 运镜翻译、long-take、action-choreography、performance、staging、art-design、otomo-wright、guzhuang-xingzhi、sound-design | 给镜头套导演手艺 | Nomi 原生 `director-*` 内置技能进 `skills/`，挂 MCP 脊柱渐进披露 |
| **C 上游剧本系统（后续）** | 剧本系统 13 skill（Truby/Mamet/Kasdan/宋方金/施拉德/即兴…） | 从想法→剧本的前置链 | 独立阶段，暂缓；先把导演侧闭环做实 |

## 分期

- **P1 · 拆镜头方法论上桌**（本次先做）：升级 `skills/workbench-storyboard-planner/SKILL.md`——演时换算法（时长从猜变算）+ 硬/软约束清单 + 污染词铁律 + 一致性要点。**纯内容、无 UI、立即让每个用户拆镜头质量变好**，无需样张。
- **P2 · 全库整过来**：把 A/B 类技能全部 Nomi 原生化进 `skills/`（目录自动注册，`skillStore.ts` 扫描即收），技能库面板可见。可用并行 subagent 分批移植 + 我逐一验收。
- **P3 · 挂上 MCP 脊柱**：给 `mcpProtocol.ts` 补 prompts / resources 原语 + 渐进披露（元数据先、SKILL.md 按需载），让内外 agent 能调技能。
- **P4 · 分步确认出初稿**（用户可见，**需样张+拍板**）：把 `rendererBridge` 确认桥从「只确认花钱」推广到方案门/参考图门/生成门；应用内 AI 编排「拆镜头→出参考图→逐镜生成→排时间轴」，每门弹卡确认（复用 `AgentPlanCard`/付费卡）；`isAppOpen` 决定走应用内卡还是 Claude 侧 elicitation。

## 需要样张拍板的（R8）

- P4 的三道确认门 UI（方案确认卡 / 参考图审阅 / 生成确认）——画前先读设计系统 + 看画布真实截图，不脑补。
- P2 技能库里 `director-*` 技能卡的呈现（是否做成 playbook 走 `ActiveSkillChip` picker）。

## 验收门

- P1：拆镜头对同一段戏，时长按演时换算给出（不再一律 5s）；提示词无污染词、物理化；`pnpm run gates` 全过。
- P2：新技能 `skillStore` 扫得到、技能库显示、缺 provider 标注正确。
- P4：真机走查 J（剧本→初稿）跑通，每门确认可拦可改；外部 Claude Code 驱动同链路可用。

## 不动项 / 回滚

- 不碰阿泽的 EP/S 目录约定、DeepSeek 省 token 规则、手动生成工作流——那些是他的工作流不是 Nomi 的。
- 不逐字打包阿泽 SKILL.md 原文（授权虽有，但 Nomi 结构不同、且要挂脊柱）——按方法论重整为 Nomi 原生。
- P1 是单文件内容改动，回滚 = 还原 SKILL.md。
