# LogPad

LogPad 是 Wilson 的本地自媒体生产驾驶舱，服务于 `media-codex` 的真人学习日志工作流。

它不是一个独立内容工厂，也不在产品层直接接 OpenAI、Anthropic 或 Ollama。LogPad 负责把选题、脚本、录制、素材、包装、发布和复盘整理成可操作界面；生成、研究、改写、巡检等重活交给本机 Codex、Claude 路由和 OpenClaw 执行。

## 当前版本

- Version: `0.3.6`
- Release line: creator-control-plane
- Status: 80/80 quality line complete
- Date: 2026-04-19

## 核心能力

- 创作者操作台：打开首页即可看到今天优先推进的选题、临近发布、缺数据复盘和卡住内容。
- 内容工厂：`/episodes` 提供全量内容资产视图，支持搜索、状态筛选、节点缺口和下一步动作。
- 开题表单：新建选题时固定标题、观众承诺、目标平台和创建后去向，并写回 `runs/<id>/episode.json`。
- 脚本编辑器：支持口播脚本、hook、标题、多平台文案、口语化检查和本机 Agent 改写。
- 录制工作台：支持分段录制指引和全屏提词器，提词器可暂停、跳段、调速、调字号。
- 素材库：支持上传、自动关联选题、图片预览、视频缩略图懒生成和 MIME sniffing。
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

生产构建：

```bash
npm run build
npm run start
```

## 环境变量

可选变量：

```bash
MEDIA_CODEX_ROOT=/Users/wilsonlu/Desktop/Ai/media/media-codex
LOGPAD_DB_PATH=/absolute/path/to/logpad.db
DATABASE_URL=file:///absolute/path/to/logpad.db
LOGPAD_ACCESS_TOKEN=your-local-token
LOGPAD_PASSWORD=your-local-password
LOGPAD_AGENT_PROVIDER=codex
```

说明：

- `MEDIA_CODEX_ROOT` 指向共享媒体工作区，默认是 `/Users/wilsonlu/Desktop/Ai/media/media-codex`。
- `LOGPAD_DB_PATH` 或 `DATABASE_URL=file://...` 用于指定 SQLite 路径。
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

当前 `v0.3.6` 验收结果：

- `npm test`: 6 files, 21 tests passed
- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run build`: passed
- `npm audit`: 0 vulnerabilities
- Playwright smoke: `/episodes` 和详情页正常加载，无业务 console error

## 项目边界

LogPad 只做操作台和结构化任务入口：

- 不自动公开发布内容
- 不替 Wilson 审批最终观点、事实风险、商业承诺、版权和隐私风险
- 不把 OpenAI/Anthropic/Ollama key 作为产品层依赖
- 不复制 `media-codex` 的业务真相源

稳定写回路径：

- `media-codex/runs/`
- `media-codex/content-packs/`
- `media-codex/truth/`
- `media-codex/team/`
- `media-codex/workspaces/`
- `media-codex/handoff/`

## 版本文档

- Release process: [`VERSIONING.md`](./VERSIONING.md)
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)
- Review report: [`REVIEW_REPORT.md`](./REVIEW_REPORT.md)
- Development plan: [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md)
- Recommendations: [`RECOMMENDATIONS.md`](./RECOMMENDATIONS.md)
