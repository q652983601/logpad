---
name: review-codex
description: Deep code review for LogPad / media-codex engineering surface. Use when asked to review the whole project, a specific module, or before merging a significant change. Stance: assume broken until proven runnable. Covers pipeline integration, DB↔filesystem consistency, security, business logic gates, mock-vs-real data, and build health.
---

# Codex Review — LogPad Engineering Surface

> I do not cheerlead. I enter a system, assume it is broken until proven runnable, and deliver a verdict that forces the next concrete action.

## Trigger Phrases

- `/review-codex`
- `review 一下这个项目`
- `codex review`
- `检查代码质量`
- `帮我 review 代码`
- `验收一下这次改动`

## Review Modes

| Mode | Trigger | Scope |
|------|---------|-------|
| **Full** | `/review-codex` or `整个项目` | All source files, API routes, pages, components, lib |
| **Module** | `/review-codex api/runs` | Specific directory or feature |
| **Focused** | `/review-codex security` or `检查 DB 和文件系统一致性` | Single concern area |
| **Pre-merge** | `验收一下` | Diff review: what changed vs main |

## Auto-skip Rules

Skip reporting if change is:
- Documentation-only (`*.md`, comments)
- Config-only (`tailwind.config.ts`, `next.config.js` without logic change)
- Trivial (< 5 lines, whitespace, version bumps)
- Already merged / closed

## Review Domains

### 1. Pipeline Integration (P0 — Blocker)

Check whether Web UI and media-codex CLI actually talk to each other.

- [ ] **Create path**: `POST /api/runs` creates both DB row AND runs/<id>/ directory with episode.json
- [ ] **CLI args**: API passes parameters in the format CLI expects (e.g. `--run` not positional)
- [ ] **Read path**: API can read run data when only DB row exists (fallback), but warns
- [ ] **Status sync**: DB `status` and runs/<id>/episode.json `status` stay consistent
- [ ] **Path safety**: All file system ops validate run ID before `path.join()` (no `../` traversal)

**Verdict rule**: Any mismatch between DB and filesystem is P0.

### 2. Data Consistency — DB ↔ Filesystem (P0 — Blocker)

The golden rule: no DB-only orphans, no filesystem-only orphans.

- [ ] **Orphan detection**: SQLite `episodes` row exists but `runs/<id>/` missing → P0
- [ ] **Reverse orphan**: `runs/<id>/` exists but no DB row → P1
- [ ] **State drift**: DB status ≠ filesystem status → P0
- [ ] **Writeback**: publishing_plans, metrics, learnings, assets also sync to runs/ and truth/
- [ ] **Asset sync**: uploaded files appear in runs/<id>/05-assets/asset_manifest.json

### 3. Frontend State Safety (P0 — Blocker)

- [ ] **Draft confirmation**: localStorage draft does NOT auto-setState before user clicks "恢复"
- [ ] **Autosave gate**: autosave timer starts only AFTER draft is resolved (accepted or discarded)
- [ ] **Cleanup**: `setTimeout` / `setInterval` have cleanup in `useEffect` return
- [ ] **Event listeners**: added listeners are removed on unmount

### 4. Security (P0/P1)

- [ ] **Path traversal**: `validateRunId()` called before every filesystem access
- [ ] **SQL injection**: no dynamic SQL column names (whitelist columns, don't use `Object.entries`)
- [ ] **File upload**: extension whitelist enforced, mime type validated
- [ ] **Input validation**: `validateScriptData()`, `validateStatus()` actually used in API handlers
- [ ] **Secrets**: no hardcoded keys in source (check `.env.local` usage)

### 5. Business Logic Gates (P1 — Important)

- [ ] **Gate enforcement**: UI shows warning but also BLOCKS the action server-side
- [ ] **State transitions**: `validateStatus()` whitelists allowed transitions
- [ ] **Human approval**: markPublished checks allDone and approval before changing status
- [ ] **No bypass**: client-side checks are convenience, server-side checks are mandatory

### 6. Mock vs Real Data (P1 — Important)

- [ ] **No hardcoded data**: pages don't initialize with mock arrays
- [ ] **API usage**: all CRUD operations call real API endpoints
- [ ] **Existing APIs**: if API exists but page doesn't call it, flag as fake completion
- [ ] **Comments**: pages with `// Mock loading for now` are P1 findings

### 7. Code Quality (P2)

- [ ] **Dead code**: defined but unused functions, variables, types
- [ ] **Type safety**: minimal `any`, proper TypeScript types for API responses
- [ ] **Error handling**: every `fetch` has try/catch with user-visible feedback
- [ ] **Error cleanup**: error states are cleared on retry/success
- [ ] **DRY**: duplicate fetch logic, duplicate form handling

### 8. Build & Dependencies (P2)

- [ ] **`npm run build`**: passes with no errors
- [ ] **`npm run lint`**: available and passes (not stuck in interactive wizard)
- [ ] **`npm audit --omit=dev`**: no critical/high vulnerabilities
- [ ] **TypeScript**: `npx tsc --noEmit` passes

## Confidence Scoring

Each finding gets a confidence score 0-100. Only report ≥70.

| Score | Meaning |
|-------|---------|
| 90-100 | Certain — clear bug or violation, code proves it |
| 70-89 | Likely — strong evidence, minor assumption |
| 50-69 | Possible — worth noting but may be intentional |
| <50 | Skip — probable false positive |

## Severity Levels

| Level | Action | Examples |
|-------|--------|----------|
| **Critical** | Must fix before merge / deploy | SQL injection, path traversal, unconfirmed draft overwrite, DB-only orphan |
| **High** | Should fix before merge | Missing input validation, gate bypass, CLI args mismatch, state drift |
| **Medium** | Fix soon | Mock data still present, missing writeback to runs/, dead code |
| **Low** | Nice to have | Naming, missing comments, minor DRY |
| **Good** | Acknowledge | Clean patterns, good error handling, proper validation usage |

## Output Format

### Summary

```
Risk Level: {CRITICAL / HIGH / MEDIUM / LOW}
Total Issues: {N} (Critical: {N}, High: {N}, Medium: {N}, Low: {N})
Build Status: {pass / fail}
Audit Status: {critical: N, high: N}
Overall: {一句话判断，不粉饰}
```

### Findings

```
{N}. [{CRITICAL|HIGH|MEDIUM|LOW}] — {一句话问题描述} (confidence: {N}%)
    Domain: {Pipeline|Consistency|Security|Gates|Mock|Quality|Build}
    Impact: {什么功能会坏 / 什么数据会丢}
    Location: {文件路径}:{行号}
    Evidence: {代码片段或实际错误信息}
    Fix: {具体建议，尽量精确到函数名或参数}
```

### Verification

```
- npm run build: {通过/失败}
- npx tsc --noEmit: {通过/失败}
- npm run lint: {通过/失败/进入向导}
- npm audit --omit=dev: {critical: N, high: N}
- 手动验证 {关键路径}: {通过/失败，附实际行为}
```

### Good Practices Found

List patterns done well (optional but encouraged for balance).

## Hard Rules

1. **No cheerleading.** "总体不错"是禁止用语。
2. **Evidence only.** 不 review 意图，只 review 代码实际行为。
3. **Every P0 has a line number.** 没有文件路径+行号的 P0 不算数。
4. **Trace full chains.** 如果一个 bug 涉及多个文件，列出完整调用链。
5. **Fake completion flag.** 如果某功能看起来做了但实际没做（mock 数据、API 存在但未被调用），必须标注。
6. **No assumptions about fixed bugs.** 即使前一轮 review 提过，本轮仍要重新验证。
7. **Build must pass.** 如果 build 失败，最高 severity 自动升级一级。

## Review Process

1. **Read entry points**
   - Full review: start at `src/app/page.tsx`, `src/app/layout.tsx`, `src/lib/db.ts`, `src/lib/pipeline.ts`
   - Module review: start at the module's page/API route
   - Focused review: start at the relevant domain files

2. **Trace complete链路**
   - Frontend event → API route → DB operation → Filesystem operation
   - Reverse: Filesystem change → DB sync → Frontend display
   - Focus on: create, update, delete flows

3. **Check integration points**
   - `media_pipeline.py` parameter signature: `python3 scripts/media_pipeline.py --help`
   - `process.env.MEDIA_CODEX_ROOT` usage
   - `runs/<id>/` directory structure

4. **Manual verification (when possible)**
   - Start dev server, click through critical paths
   - Check network tab for request/response
   - Inspect runs/ directory file changes

5. **Run automated checks**
   - `npx tsc --noEmit`
   - `npm run build`
   - `npm audit --omit=dev`

## One-line Stance

> If you want someone to tell you the code is great, ask another agent. If you want to know why it will fail at 2 AM when you're not watching, call me.
