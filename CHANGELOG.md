# Changelog

All notable LogPad changes are tracked here.

This project follows a pragmatic SemVer-style workflow:

- `MAJOR`: workflow or data contract changes that require migration.
- `MINOR`: user-facing product capability additions.
- `PATCH`: bug fixes, safety improvements, documentation, validation, and small UX polish.

## [0.3.7] - 2026-04-19

### Added

- Added active episode sync from `business-folder-os/03-episodes/active/` into LogPad's `/api/runs` list so current real work appears automatically.
- Added a global `Cmd/Ctrl + K` command palette for navigation, recent episode actions, script entry, recording entry, and quick notes.
- Added `UX_BENCHMARKS.md` with the research inputs, SUS target, task benchmarks, and component strategy for human-first operation.

### Changed

- Split publish readiness from full loop completion: publishing now checks pre-publish gates only, while `metrics` and `review` remain post-publish loop stages.
- Changed missing script and packaging reads for existing runs to return empty objects, letting active episodes open in script and recording workspaces before all files exist.
- Improved quick-note routing by allowing command palette launch and writing the note content into the created topic description.

### Fixed

- Fixed a real smoke-test stability issue where the service worker cache-first strategy could serve stale Next.js chunks after a local release.
- Changed service worker behavior so API calls, app navigations, and `/_next/` chunks are network-first.
- Bumped the service worker cache name to `logpad-v0.3.7` so older cached app shells are cleared during activation.
- Fixed the script page heading copy from the older content-factory label to `脚本工作台`.

### Documentation

- Added a "首次试用" path to `README.md` for Wilson's first real app trial.
- Updated current validation notes to reflect the latest smoke-test finding and fix.

### Verification

- `npm test`: passed, 6 files, 22 tests.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm audit`: passed, 0 vulnerabilities.
- Playwright smoke: 9 key routes returned HTTP 200; command palette keyboard flow opened Sony active episode recording; console errors 0.

## [0.3.6] - 2026-04-19

### Added

- Added `README.md`, `VERSIONING.md`, and this changelog for local and GitHub version management.
- Added `/episodes` as a real content factory workspace with search, status filter, stats, pipeline progress, next missing stage, and next action links.
- Added richer topic creation on the creator dashboard: title, viewer promise, target platforms, and post-create destination.
- Added filesystem writeback for topic promise and target platforms into `runs/<episode_id>/episode.json`.
- Added topic promise and target platform display on episode detail pages.
- Added full-screen teleprompter controls for pause/resume, beat jumping, keyboard shortcuts, speed, and font size.
- Added thumbnail brief selection and "write into publishing description" flow in the distribution desk.
- Added OpenClaw handoff endpoint for agent patrol tasks.
- Added optional local auth with `LOGPAD_ACCESS_TOKEN` / `LOGPAD_PASSWORD`.
- Added Zod schemas, Vitest config, API validation tests, auth tests, pagination tests, DB path tests, and pipeline status tests.
- Added TanStack Query provider scaffold for future data-fetching migration.

### Changed

- Changed `/api/ai` from direct model API calls to a local Agent dispatcher boundary.
- Changed `/api/cli` to reject free-form `args` and use a command-level Zod whitelist.
- Changed `/api/runs` and `/api/assets` to support pagination headers.
- Changed upload handling to validate file magic bytes instead of trusting extension-only MIME claims.
- Changed publishing readiness to use shared pipeline completion helpers across client and server.
- Changed review metric calculations so zero-view rows do not produce misleading ratios.
- Changed asset video thumbnails to lazy-generate only after entering the viewport.
- Changed asset images to use `next/image`.
- Changed SQLite path resolution to support `LOGPAD_DB_PATH` and `DATABASE_URL=file://...`.
- Changed service worker registration to surface update prompts.
- Changed key internal app links from raw anchors to Next `Link` where appropriate.
- Changed docs to align with the current "real-person learning log + local agents" direction.

### Fixed

- Fixed CLI argument injection risk by removing raw argument passthrough.
- Fixed AI action rate-limit gap with local request limiting.
- Fixed MIME spoofing risk for uploads.
- Fixed orphan file cleanup when deleting uploaded assets.
- Fixed client/server publishing checklist drift.
- Fixed stale script draft detection.
- Fixed lint warnings and added typecheck to the standard validation chain.
- Fixed `127.0.0.1` HMR dev-origin warning with Next dev config.

### Security

- Hardened local API inputs with Zod validation.
- Added optional Basic/Bearer local access guard.
- Kept model provider and token handling outside the product layer.
- Current `npm audit`: 0 vulnerabilities.

### Verification

- `npm test`: passed, 6 files, 21 tests.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm audit`: passed, 0 vulnerabilities.
- Playwright smoke: `/episodes` and episode detail page loaded correctly with no business console errors.

## [0.3.0] - 2026-04-18

### Added

- Added initial local Agent-assisted script actions.
- Added CLI bridge for `media_pipeline.py` status, validate, advance, and make-pack flows.
- Added packaging lab, asset manager, distribution desk, and review dashboard as the core product surface.

## [0.1.0] - 2026-04-18

### Added

- Added initial LogPad Next.js App Router app.
- Added local SQLite index plus `media-codex/runs/` filesystem integration.
- Added topic board, script editor, recording brief, and episode detail pages.
