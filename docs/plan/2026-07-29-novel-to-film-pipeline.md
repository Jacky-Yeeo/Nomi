# 小说→成片 直出管线(Novel-to-Film Pipeline)— 总体方案 + M1 编排引擎施工方案

> 2026-07-29 用户拍板:定位=**结构化直出初稿+全程可介入**(不做黑盒一键);起步=**M1 编排引擎先行**。
> 依据:① 5 路调研《小说/长文→AI漫剧 固化工作流景观》(research/2026-07-29-novel-to-video-pipeline-landscape.md,不入公开 git):五段管线全行业收敛、「一键」被业界证伪、40-50% 人工耗在抽卡/修穿帮;② 积木盘点(本文 §2);③ 论文雷达 2026-07-29:OmniScript 坐实「per-shot 结构化脚本=行业中间表示」,反向验证 storyboardPlan 方向。

## 0. 一句话

把 Nomi 已有的「拆镜→生成→verify→排片→配音字幕→导出」积木,用一个**可断点续跑、带预算闸的管线引擎**串成「丢一本小说→直出一集已验过的初稿」;每层(剧集/剧本/分镜/镜头)都是结构化对象、都可人工介入单点重跑;工作流定义=playbook 单源,App 内 runner 与 MCP 编排工具消费同一份(P1/P4)。

**用户看到什么(终态,M1-M5 全落后)**:导入小说 → 剧集列表+分集剧本进创作区 → 点「直出这一集」→ 画布分镜卡逐个亮起、verify 给每镜打分标红坏镜 → 时间轴上成片已拼好带配音字幕 → 人只处理标红的几镜。

**差异化(vs 剪映漫剧/有戏AI/Catimind)**:别人一键出「要人肉抽卡的素材」,Nomi 直出「已自动验过、坏镜标出来等你处理」的初稿;本地+BYOM,量产工作室成本结构不同;每层可介入,单镜重跑不重跑全片。

## 1. 分期总览(M1 是中枢,M2-M4 挂其上,M5 是暴露面)

| 期 | 交付 | 用户看到 | 依赖 |
|---|---|---|---|
| **M1 编排引擎(本文详设)** | PipelineRunner 接真执行+断点续跑+预算闸+进度事件;MCP `nomi_run_pipeline`;App 进度卡 | 任务进度卡:阶段推进/暂停审阅/续跑;外部 AI 可经 MCP 驱动一串步骤 | 无 |
| M2 长文导入+剧集层 | docx/txt→切章→LLM 改编分集剧本;episode 数据模型;创作区剧集列表 | 丢一本小说→得到一季分集剧本,每集可改 | M1(改编=管线 stage) |
| M3 中段自动循环 | 拆镜→批量生成→shotVerify→replan 挂进引擎无人值守跑(收编现有 UI 驱动,同 commit 删旧驱动,P1) | 点「直出这一集」画布自己长出分镜并生成,坏镜标红 | M1 |
| M4 尾段批量编排 | 逐镜台词→批量 TTS→音轨铺排+字幕 clip 按镜号对齐落轨→排片→导出 | 成片躺在时间轴上,带配音字幕 | M1;M3 产物 |
| M5 Skill 化+MCP 外露 | 「小说成片」workflow=内置 playbook 进技能库(用户可改/分享);MCP 工具面补齐 | 技能库里可见可编辑该工作流;Claude/Codex 给一本小说驱动 Nomi 出片 | M1-M4 |

## 2. 现状积木(Explore 实测 2026-07-29,file:line 以 main@239615c8 为准)

- **编排骨架已有、未接真执行**:`electron/skills/playbookOrchestrator.ts`(PlaybookRun 状态机:拓扑排序/pause/advance,纯逻辑可单测);stages schema `electron/skills/skillManifestSchema.ts:63`(id/goal/tools 白名单/dependsOn/pause/modelPrefs,modelPrefs 只声明能力身份不绑 vendor,P4 已焊死)。注释明言「真正跑 agent loop 的仍是现有那条链;live 驱动在有 UI 的切片里接」——**M1 就是接上这一段**。
- **headless 执行面已有**:`electron/capabilityCore/core.ts`(主进程单一执行口:listAllProjects/createNamedProject/addProjectNodes/connectProjectNodes/setProjectNodePrompt/generateOnProject 含提交幂等键+轮询取回;app 开着走 RPC、关着 headless)。MCP 9 个原子工具注册于 `electron/capabilityCore/mcpProtocol.ts:25`。
- **分镜结构化文档**:`src/workbench/generationCanvas/agent/storyboardPlan.ts`(PlanShot: index/shotKind/durationSec/anchorIds/prompt/keyframe;PlanAnchor=character/scene/prop/style 跨镜锚;zod 校验;storyboardPlanToArgs 落画布)。
- **verify 闭环**:`shotVerify.ts`(identity/composition/continuity 三轴,阈值 3)+ `storyboardLoopBudget.ts`(maxRounds 缺省 2/上限 5)+ runner/judge/store——当前由画布助手 UI 驱动。
- **花钱确认已有全局机制**:MCP/App 双路 spend-confirm(hybrid 网关+确认卡,记忆 mcp-spend-confirm-global-fix)——预算闸**复用它,不新造**。
- **四缺口**:episode 层(无)、长文结构化导入(无,附件只能喂 LLM)、**编排引擎真执行(M1)**、TTS/字幕批量编排(原子 API 在:addTimelineTextClip 等 workbenchStore.ts:218,缺批量函数)。

## 3. M1 详设:编排引擎接真执行

### 3.1 分层(R9)

```
定义层  PipelineDefinition = SkillManifest.stages(已有 schema,不新造格式)
        + stage 执行契约扩展(§3.2,扩 skillStageSchema 可选字段)
编排层  PipelineRunner(新,electron/pipeline/):消费 PlaybookRun 状态机,
        逐 stage 调执行器;进度事件;暂停/续跑/取消
执行层  StageExecutor 注册表(新):每个 stage.kind 映射到一个主进程函数
        —— 'agent-turn'(经 agentChatV2 跑一回合 LLM,工具白名单=stage.tools)
        —— 'core-action'(直调能力核:generateOnProject / addProjectNodes …)
持久化  PipelineRunState 落项目目录(新):游标/每 stage 产物引用/花费累计;
        重启后从游标续跑(断点续传,对齐开源 AI_novel 的 checkpoint 共识)
暴露面  App:进度卡(UI 切片,实现前按 R8 出样张)
        MCP:nomi_run_pipeline / nomi_pipeline_status / nomi_pipeline_resume
        (mcpProtocol.ts TOOLS 表加三项,复用同一 Runner——P1 无并行版)
```

### 3.2 stage 执行契约(扩展,向后兼容)

`skillStageSchema` 加可选字段(无 = 现状纯 prompt 段,零破坏):
- `kind?: 'agent-turn' | 'core-action'`(缺省 agent-turn,对齐原设计「复用 agentChatV2 不新造 agent」);
- `action?: string`(kind=core-action 时指能力核方法名,zod 枚举白名单);
- `costly?: boolean`(true ⇒ 执行前过预算闸);
- `produces?: string`(产物键,如 'storyboardPlan',写进 RunState 供下游 stage 读)。

### 3.3 预算闸(不新造,挂已有 spend-confirm)

- `costly` stage 启动前:汇总本 stage 预估调用数(如分镜 N 镜 ⇒ N 次生成)→ 走现有确认路(App 开着=确认卡;headless/MCP=elicitation;`NOMI_LOOP_SPEND_OK=1` 的 E2E 旁路保留)。
- loopBudget(verify 重跑上限)沿用 `storyboardLoopBudget.ts`,M1 不改语义。
- 铁律:**重试绝不包住付费提交**(记忆 retry-must-not-wrap-paid-submit)——Runner 的 stage 级重试只许包 agent-turn(免费规划),core-action 的生成失败走「可找回态」不自动重发。

### 3.4 断点续跑

- `PipelineRunState` JSON 落项目目录(与注册表同级,跨进程 mkdir 锁复用 poison-project-not-found 的修法);字段:pipelineId/skillKey/游标/stage 产物引用(节点 id、文档 id,不内联大对象)/spentEstimate/状态(running|awaiting-confirm|paused|done|failed)。
- 续跑 = 读 RunState → PlaybookRun 快进到游标 → 从当前 stage 重入(stage 内不做半步续,粒度=stage,简单可靠)。
- 生成类产物本就落画布节点(可找回态已有),RunState 只存引用——**不另建产物存储**(P1)。

### 3.5 MCP 工具(编排级,3 个)

- `nomi_run_pipeline { projectId?, skillKey, inputs }` → 起跑,返 pipelineId(异步,不阻塞到完片);
- `nomi_pipeline_status { pipelineId }` → 阶段/进度/待确认项/产物引用;
- `nomi_pipeline_resume { pipelineId, confirm? }` → 确认暂停闸/续跑。
- 单动作 9 工具不动(外部 AI 仍可精细操作);编排工具与 App 进度卡消费**同一个 Runner 实例**的事件。

### 3.6 M1 验收门

1. 单测:契约 schema 兼容(旧 manifest 全过)/Runner 状态迁移/断点续跑(杀进程重入)/预算闸拦截(costly 未确认不执行)/重试不包付费提交。
2. headless E2E:一个 3-stage 测试 playbook(规划→core-action 加节点→规划)零额度全跑通;再跑一次含 1 镜真生成的最小管线(评测额度,事后报花销)。
3. MCP:外部 client 起跑→status 轮询→resume 确认→完成,全链真跑。
4. 五门全绿;进度卡 UI 切片另行 R8 样张+真机走查(R13)后才算 M1 完整交付。

### 3.7 M1 范围外(不动项)

- 不碰:现有画布助手的 verify 驱动(M3 收编时同 commit 删)、9 个单动作 MCP 工具语义、storyboardPlan schema(M2 扩 episode 时才动,参照 OmniScript 字段形评估 per-shot 对白字段)、技能库面板 UI(M5)。
- 回滚:M1 全部为新增文件+schema 可选字段,revert 即回滚,无迁移。

## 4. 开放问题(M2 前拍板,不阻塞 M1)

1. episode 放哪层:项目=一部剧(集=画布分组)vs 项目=一集(剧=项目组)——牵动工作区模型,M2 方案文档里给对比表。
2. 长文改编的「剧集大纲→单集剧本」两级 LLM 编排的 token 成本与质量;是否引入分章缓存。
3. 漫剧风格包(画风锚)是否进 M3:调研显示 13 款画风是剪映卖点,Nomi 可用 style anchor + 提示词库表情/定妆包承接(低成本,倾向做)。
4. 目标用户细分:量产工作室(BYOM 省钱敏感)vs 个人创作者(体验敏感)——影响 M4 之后的默认值与文案,不影响架构。

## 5. 六角色评审(R7)

- **CTO**:管线定义复用 stages schema 单源,App/MCP 同 Runner,无并行版;风险=agentChatV2 回合的可编排性(工具白名单/上下文注入是否够干净),M1 第一周先立这个探针。✔
- **设计**:进度卡是新组件,必须走 nomi-design-system + 样张;「坏镜标红」延用 ReconcileDeviationCard 语汇,不造新隐喻。✔
- **PM**:M1 无直接用户价值,是赌后面三期的地基——但 MCP 编排工具本身就是可讲的卖点(外部 AI 驱动 Nomi);M2 是第一个可传播 demo(丢小说出剧本)。接受。✔
- **前端**:进度卡消费事件流,别把 Runner 状态镜像进 Zustand 双真相源——store 只存视图态,RunState 是唯一真相(对齐 harness EventLog 经验)。✔
- **后端**:断点粒度=stage 是对的,别做 stage 内半步续(复杂度爆炸);生成幂等键已有,续跑重入不会双扣费。✔
- **真实用户(量产工作室)**:「直出一集要多少钱、多久」必须在预算闸上直接可见(D4 诚实);坏镜标红后的单镜重跑必须一键。✔

## 6. 施工顺序(M1 内切片,每片五门绿+单测过再 commit)

1. 契约扩展+RunState 持久化+Runner 骨架(纯逻辑,单测覆盖状态机/续跑);
2. StageExecutor:core-action 路(接能力核,headless E2E 零额度);
3. StageExecutor:agent-turn 路(接 agentChatV2,含工具白名单收紧);
4. 预算闸接 spend-confirm+重试边界单测;
5. MCP 三工具+外部 client 真跑;
6. App 进度卡(先 R8 样张拍板再动)。
