<p align="center">
  <img src="public/nomi-logo.svg" alt="Nomi" width="80" />
</p>

# Nomi

**把镜头讲清楚，不让模型猜。**

Nomi 是本地优先、开源的 AI 视频导演工作台：把故事、分镜、视觉锚点、生成画布和时间线保持在同一个上下文里。

[English](README.md) · [官网](https://nomiaqm.com/) · [下载](https://github.com/aqm857886159/Nomi/releases/latest) · [夸克网盘镜像](https://pan.quark.cn/s/d3322c17e7b6) · [加入用户群](#用户群) · [团队合作](#团队服务) · [看 60 秒宣传片](https://nomiaqm.com/assets/demo.mp4)

## 微信联系

### 加入 Nomi 用户群

<p align="center">
  <a href="docs/media/nomi-canvas-group-wechat.png"><img src="docs/media/nomi-canvas-group-wechat.png" alt="Nomi 用户群微信二维码" width="220" /></a>
</p>

<p align="center">
  <strong>扫码加入 Nomi 用户群</strong><br />
  群内反馈会直接进入产品迭代。
</p>

### 群码失效 / 项目合作

<p align="center">
  <a href="docs/media/qingyang-wechat.jpg"><img src="docs/media/qingyang-wechat.jpg" alt="Nomi 作者青阳的微信二维码" width="180" /></a>
</p>

<p align="center">
  群码失效，或沟通定制开发、系统集成、贴牌交付与持续迭代，请添加作者微信 <strong>TZ857886159</strong>。
</p>

[参与 GitHub 讨论](https://github.com/aqm857886159/Nomi/discussions) · [提交商务咨询](https://github.com/aqm857886159/Nomi/issues/new?template=business_inquiry.yml)

[![最新版本](https://img.shields.io/github/v/release/aqm857886159/Nomi?label=release)](https://github.com/aqm857886159/Nomi/releases/latest)
![平台](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-1a1816)
[![许可证](https://img.shields.io/badge/license-AGPL--3.0--only-1a1816)](LICENSE)

[![Nomi 导演工作流](marketing/assets/video/hero-poster.jpg)](https://nomiaqm.com/assets/demo.mp4)

## 为什么是 Nomi

- **上下文持续连接**：故事、角色、分镜、生成证据和时间线留在同一个项目里，不再在多个工具之间反复搬运。
- **先锁定视觉世界**：先固定人物、场景、道具、机位和风格，让后续镜头继承同一组视觉锚点。
- **可导演的工作流**：在画布上看完整序列、连接参考、选择生成结果，再进入真实时间线完成导出。
- **MCP + Skills 智能创作**：一键接入 Claude Code、Codex 或 Cursor。AI 助手可以通过 Nomi MCP 调用 Skills，建立项目、生成分镜、连接参考并推进到可编辑初稿；最终画面、剪辑和导出仍由你决定。

## 下载

| 系统 | 适用机型 | 下载 |
|---|---|---|
| macOS | Apple Silicon（M 系列） | [Nomi-mac-arm64.dmg](https://github.com/aqm857886159/Nomi/releases/latest/download/Nomi-mac-arm64.dmg) |
| macOS | Intel 芯片 | [Nomi-mac-intel.dmg](https://github.com/aqm857886159/Nomi/releases/latest/download/Nomi-mac-intel.dmg) |
| Windows | Windows 10 / 11 | [Nomi-windows-setup.exe](https://github.com/aqm857886159/Nomi/releases/latest/download/Nomi-windows-setup.exe) |

🇨🇳 GitHub 打不开或下载慢：[夸克网盘镜像](https://pan.quark.cn/s/d3322c17e7b6)。最新版本以 [GitHub Releases](https://github.com/aqm857886159/Nomi/releases/latest) 和 [官网](https://nomiaqm.com/)为准。

<details>
<summary>第一次打开提示“未知开发者 / 已损坏”</summary>

- **macOS**：把 `Nomi.app` 拖进“应用程序”，在终端运行 `xattr -cr /Applications/Nomi.app`，然后重新打开。
- **Windows**：SmartScreen 弹窗选择“更多信息”→“仍要运行”。

</details>

## 三步开始

1. **接入模型**：选择预置供应商并填写一个 Key，或添加自己的 OpenAI / Responses / Anthropic 兼容接口。
2. **说出镜头意图**：写一个故事或一句镜头描述，让 Nomi 或已接入的 AI 助手生成可编辑的分镜与画布方案。
3. **导演并导出**：检查视觉锚点，用自己配置的模型生成图片或视频，选择结果、排上时间线并导出 MP4。

详细说明：[使用指南](docs/user-guide.md) · [模型接入](docs/provider-integration.md) · [CLI + MCP 指南](docs/guide/capability-core-cli-mcp.md)

## 团队服务

如果你想把 Nomi 变成内部 AI 视频工作台、客户项目、垂直行业流程或贴牌产品，我们可以从首次验证一直做到上线后的持续迭代：

- 定制开发
- 系统与模型集成
- 贴牌交付与商业授权
- 持续优化、维护与迭代

[提交商务咨询](https://github.com/aqm857886159/Nomi/issues/new?template=business_inquiry.yml)，或添加作者微信 **TZ857886159**（[查看个人微信二维码](docs/media/qingyang-wechat.jpg)）。GitHub Issue 是公开页面，请勿填写密钥、私人联系方式、预算明细或受 NDA 保护的材料。

## 用户群

欢迎加入“nomi 画布群”，反馈会直接进入产品迭代。

群二维码已放在 README 首屏；也可以[打开群二维码原图](docs/media/nomi-canvas-group-wechat.png)。二维码不可用时，添加作者微信 **TZ857886159** 拉你进群。

## 开发者

需要 Node.js 20+ 与 pnpm，无需 Docker 或数据库。

```bash
git clone https://github.com/aqm857886159/Nomi.git
cd Nomi
corepack enable
pnpm install
pnpm dev
```

```text
electron/    Electron 主进程、本地运行时、文件存储与模型调用
src/         React + Vite + Tailwind 工作台
skills/      Skill Pack v2，详见 docs/skill-pack-format.md
```

提交前运行：

```bash
pnpm run test
pnpm run typecheck
pnpm run gates
```

## 贡献与许可证

欢迎提交 Bug、需求、文档和代码。外部贡献者在 Pull Request 中一次性签署 [CLA](CLA.md)。

当前版本采用 **[AGPL-3.0-only](LICENSE)**；此前以 Apache-2.0 发布的历史版本继续保留原许可证。闭源集成、换牌分发或其他商业授权需求，请通过[商务咨询](https://github.com/aqm857886159/Nomi/issues/new?template=business_inquiry.yml)联系。

## 关于作者

**青阳** — AI 产品经理 / 创作者

[打开作者微信二维码原图](docs/media/qingyang-wechat.jpg)，或直接添加微信 **TZ857886159**。
