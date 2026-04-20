# LogPad

LogPad Web/PWA 是 Wilson 自媒体生产系统的轻量辅助端。第一性产品和操作真相源是 `../logpad-macos/` 与 `../logpad-macos/workspace/`。

它不是一个独立内容工厂，也不在产品层直接接 OpenAI、Anthropic 或 Ollama。LogPad 负责把选题、脚本、录制、素材、包装、发布和复盘整理成可操作界面；生成、研究、改写、巡检等重活交给本机 Codex、Claude 路由和 OpenClaw 执行。

## 当前版本

- Version: `0.4.1`
- Version: `0.4.2`
- Release line: web-pwa-companion
- Status: Mac-first workspace bridge
- Date: 2026-04-20

## 核心能力

- 创作者操作台：打开首页即可看到今天优先推进的选题、临近发布、缺数据复盘和卡住内容。
- 内容工厂：`/episodes` 提供全量内容资产视图，支持搜索、状态筛选、节点缺口和下一步动作。
- 口述资料库：`/voice` 支持上传录音、保存转写、摘要提炼、任意组合笔记、本机 Agent 讨论并转成选题。
- Active episode bridge：自动把 `business-folder-os/03-episodes/active/` 里的当前真实样片同步进 LogPad。
- 快速指令：按 `Cmd/Ctrl + K` 打开命令面板，快速进入页面、最近选题、脚本、录制和灵感速记。
- 浅色/深色主题：默认浅色，侧边栏可一键切换并记住偏好。
- 开题表单：新建选题时固定标题、观众承诺、目标平台和创建后去向，并写回 Mac workspace 的 `03-content-projects/runs/<id>/episode.json`。
- 脚本编辑器：支持口播脚本、hook、标题、多平台文案、口语化检查和本机 Agent 改写。
- 录制工作台：支持分段录制指引、全屏提词器和可写回的 Take 管理，提词器可暂停、跳段、调速、调字号。
- 素材库：支持上传、本地文件夹索引、自动关联选题、图片预览、视频/音频本地预览、Range streaming 和 MIME sniffing。
- 包装车间：支持 Remotion 时间轴、插画需求和包装计划管理。
- 发布台：支持多平台发布计划、发布 checklist、封面 brief 生成、封面方案选择并写入发布说明。
- 数据复盘：支持平台数据录入、基础诊断和学习银行。
- 本机 Agent routing：LogPad 发结构化任务，Codex/Claude/OpenClaw 本地执行。

## 本地运行

```bash
npm install
npm run dev
```

默认访问：

```text
http://127.0.0.1:3000
```

## 首次试用

建议按这个顺序试：

1. 打开首页，看“今天先推进这些”，确认今天该先做哪个选题。
2. 按 `Cmd/Ctrl + K`，试一下快速进入 Sony 50mm、脚本页、录制页、口述资料库和灵感速记。
3. 如果要开新题，点“新建选题”，填写标题、观众承诺、目标平台，先选“先判断选题”。
4. 进入 `/episodes`，确认当前 active episode 和新选题都在内容工厂里。
5. 进入单期详情页，看 10 个生产节点和下一步动作。
6. 进入脚本页，写或改主脚本、hook、标题和多平台文案。
7. 进入录制页，打开全屏提词器，试暂停、跳段、调速和调字号；录完后在 Take 管理里保存可用/备用/重录状态。
8. 上传一个素材到素材库，或输入本地文件夹路径建立素材索引。
9. 到发布台生成封面 brief，选择一个方案写入发布说明。
10. 发布后到数据复盘录入数据，把结论写进学习银行。

如果页面一直停在“加载中”，先强制刷新浏览器。`v0.3.7+` 已修正旧 service worker 缓存 Next.js chunk 的问题；旧浏览器会在刷新后拿到新的 service worker。

生产构建：

```bash
npm run build
npm run start
```

## 环境变量

可选变量：

```bash
MEDIA_CODEX_ROOT=/Users/wilsonlu/Desktop/Ai/media/media-codex
LOGPAD_WORKSPACE_ROOT=/Users/wilsonlu/Desktop/Ai/media/media-codex/logpad-macos/workspace
LOGPAD_BUSINESS_ROOT=/Users/wilsonlu/Desktop/Ai/media/media-codex
LOGPAD_PIPELINE_ROOT=/Users/wilsonlu/Desktop/Ai/media/media-codex
LOGPAD_DB_PATH=/absolute/path/to/logpad.db
DATABASE_URL=file:///absolute/path/to/logpad.db
LOGPAD_ACCESS_TOKEN=your-local-token
LOGPAD_PASSWORD=your-local-password
LOGPAD_AGENT_PROVIDER=codex
```

说明：

- `LOGPAD_WORKSPACE_ROOT` 是第一性操作真相源，默认是 `/Users/wilsonlu/Desktop/Ai/media/media-codex/logpad-macos/workspace`。
- `LOGPAD_BUSINESS_ROOT` 指向 legacy/business 上层媒体工作区，用于读取 business-folder-os、旧资料和协议。
- `LOGPAD_PIPELINE_ROOT` 指向旧 Python pipeline 脚本所在根目录；脚本执行可以留在旧根，但 run 参数会指向 Mac workspace。
- `LOGPAD_DB_PATH` 或 `DATABASE_URL=file://...` 用于指定 SQLite 路径。默认建议放在 `logpad-macos/workspace/01-app-control/state/logpad.db`，SQLite 是索引/cache，不是内容第一真相源。
- `LOGPAD_ACCESS_TOKEN` / `LOGPAD_PASSWORD` 设置后，页面和 API 会启用本地 Basic/Bearer 守卫。
- `LOGPAD_AGENT_PROVIDER` 默认可由本机 Agent dispatcher 选择，产品层不硬编码模型 provider。

## 验收命令

每次发版前至少跑：

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm audit
```

当前 `v0.4.2` 验收结果：

- `npm test`: 7 files, 28 tests passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed, with a Turbopack NFT trace warning from server-side filesystem routes
- `npm audit`: dependency set unchanged from previous release
- Mac-first path tests confirm Web/PWA defaults to `logpad-macos/workspace/03-content-projects/runs`
- `v0.4.0` 增加口述资料库、本地文件夹素材索引和本地音视频预览
- `v0.4.1` 增加默认浅色主题和主题切换
- `v0.3.7+` 修复了旧 service worker 导致页面卡在“加载中”的升级问题

## 项目边界

LogPad 只做操作台和结构化任务入口：

- 不自动公开发布内容
- 不替 Wilson 审批最终观点、事实风险、商业承诺、版权和隐私风险
- 不把 OpenAI/Anthropic/Ollama key 作为产品层依赖
- 不再把 Web/PWA 自己当成真相源

稳定写回路径：

- `logpad-macos/workspace/03-content-projects/runs/`
- `logpad-macos/workspace/04-inspiration-library/`
- `logpad-macos/workspace/05-local-assets/indexes/`
- `logpad-macos/workspace/06-review-bank/`
- `logpad-macos/workspace/07-business-truth/`
- `logpad-macos/workspace/02-agent-workflows/`

## 版本文档

- Release process: [`VERSIONING.md`](./VERSIONING.md)
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)
- Review report: [`REVIEW_REPORT.md`](./REVIEW_REPORT.md)
- UX benchmarks: [`UX_BENCHMARKS.md`](./UX_BENCHMARKS.md)
- Voice Inbox blueprint: [`VOICE_INBOX_BLUEPRINT.md`](./VOICE_INBOX_BLUEPRINT.md)
- Asset library blueprint: [`ASSET_LIBRARY_BLUEPRINT.md`](./ASSET_LIBRARY_BLUEPRINT.md)
- Next development: [`NEXT_DEVELOPMENT.md`](./NEXT_DEVELOPMENT.md)
- Development plan: [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md)
- Recommendations: [`RECOMMENDATIONS.md`](./RECOMMENDATIONS.md)
