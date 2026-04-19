# LogPad Next Development

> Date: 2026-04-19
> Current release: v0.4.0

## Current State

LogPad is usable for Wilson's local self-media loop:

- Active episodes sync into the app.
- `Cmd/Ctrl + K` opens the command palette.
- Sony 50mm can be opened directly from the homepage and command palette.
- Recording page has a durable Take manager that writes to `runs/<episode_id>/07-production/takes.json`.
- Voice Inbox can capture audio/text ideas, combine selected notes, run local Agent discussion, and convert a collection into an episode.
- Asset library can index a local folder without copying the original files and preview local audio/video through Range-capable file serving.
- Publishing gate no longer waits for post-publish metrics/review.
- Smoke tests passed for the core pages.

## Next Best Moves

1. **Verified research pass for Voice Inbox**
   Add a source register step that turns Agent theory/paper suggestions into verified source links and claim risk levels.

2. **Asset manifest integration for indexed assets and takes**
   When a take has an `asset_path`, offer a button to register it into `05-assets/asset_manifest.json` with source, rights, and usage fields.

3. **Upload/import from recording page**
   Add a small upload or local-path import action inside Take 管理 so Wilson does not have to switch to 素材库 after recording.

4. **Human production approval**
   Add a separate `production_check.json` writer only after all required takes are marked usable/backup and Wilson approves. Do not auto-complete production just because takes exist.

5. **Mobile/touch smoke pass**
   Test `/`, `/episodes`, recording, assets, and distribution at mobile width. Recording page now works better than before, but still needs a full touch workflow pass.

6. **Agent result writeback**
   Convert agent outputs in script, packaging, and review from plain text into applyable diffs with source files and target writeback paths.

7. **SUS session**
   After one real Sony 50mm work session, score LogPad using SUS and record the top 3 frictions in this file.

## Suggested Next Session Commands

```bash
cd /Users/wilsonlu/Desktop/Ai/media/media-codex/logpad
npm test
npm run lint
npm run typecheck
npm run build
npm audit
```

For browser smoke:

```bash
npm run start -- --hostname 0.0.0.0
```

Then open:

```text
http://127.0.0.1:3000
```

## Do Not Regress

- Do not hard-code OpenAI, Anthropic, Ollama, or provider keys into product code.
- Do not auto-publish public content.
- Do not auto-mark `production_check.json` complete without a human approval gate.
- Keep real business/media truth in `media-codex/runs/`, `business-folder-os/`, `truth/`, `team/`, and `handoff/`.
