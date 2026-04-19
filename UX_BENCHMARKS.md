# LogPad Human Usability Benchmarks

> Date: 2026-04-19
> Version: v0.3.8
> Goal: make LogPad easier for a real creator to operate without remembering folder paths, page structure, or agent handoff details.

## Research Inputs

This upgrade uses four practical references:

- Amershi et al., "Guidelines for Human-AI Interaction": AI should make clear what it can do, show status, support correction, and fail gracefully.
  Source: https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/
- Microsoft HAX Toolkit: human-AI systems need explicit handoff, feedback, and recovery patterns.
  Source: https://www.microsoft.com/en-us/haxtoolkit/
- Nielsen Norman Group, 10 Usability Heuristics: prioritize visibility of system status, match to the real world, user control, consistency, error prevention, recognition over recall, and efficiency.
  Source: https://www.nngroup.com/articles/ten-usability-heuristics/
- System Usability Scale: use 80+ as the working target for "ready for daily use", not only "usable".
  Source: https://measuringu.com/sus/

## Target UX Bar

| Benchmark | Target | Why it matters for Wilson |
|---|---:|---|
| SUS score | 80+ | The app should feel good enough for daily self-media work, not just pass tests. |
| Time to next action | Under 10 seconds after opening homepage | The app must answer "what should I do now?" immediately. |
| Navigation recall | 0 required route memorization | Common actions should be available by search or shortcut. |
| Critical page smoke | 100% key pages load with no console errors | A local tool should not interrupt recording or publishing. |
| Publish gate false block | 0 known false blocks | Metrics and review happen after publishing; they must not block publishing. |
| Active work visibility | Current active episode appears automatically | Real work in `business-folder-os/03-episodes/active/` must not be invisible. |

## Component Strategy

1. **Guided next step**
   Homepage and content factory should always expose the next concrete action for each episode.

2. **Command palette**
   `Cmd/Ctrl + K` reduces route recall and lets a creator jump directly to pages, recent episodes, script, recording, and quick notes.

3. **Active episode bridge**
   Current real episodes from the business OS are synced into the app automatically, so Wilson does not need to recreate existing work.

4. **Pre-publish gate**
   Publishing readiness checks only pre-publish stages. Metrics and review remain part of the full loop but happen after publishing.

5. **Visible feedback**
   Quick-note save/send actions use toast feedback and accessible live regions.

6. **Keyboard-first operation**
   Command palette supports search, arrows, Enter, and Escape.

## v0.3.7-v0.3.8 Implementation Map

| Problem | Shipped fix |
|---|---|
| Current Sony 50mm active episode was not guaranteed to appear in LogPad. | Added active episode sync from `business-folder-os/03-episodes/active/` into `/api/runs`. |
| Users had to remember where script, recording, assets, publishing, and review pages live. | Added global command palette with recent episode actions. |
| Publishing could be blocked by `metrics` and `review`, which are post-publish stages. | Split `isReadyToPublish` from full `isPipelineComplete`. |
| Smoke test exposed stale service worker chunks after upgrade. | Changed service worker to network-first for app pages, API, and Next chunks. |
| Quick-note ideas had weak system feedback. | Added command palette trigger, topic description writeback, and accessible status feedback. |
| Recording take status was static and not durable. | Added beat-level Take management with save to `07-production/takes.json`. |

## Next Measurement Loop

Run this after one real work session:

1. Score the app with SUS.
2. Record whether the first useful action was found within 10 seconds.
3. Count how many times Wilson had to manually find a folder or remember a route.
4. Record any page where the next action was unclear.
5. Convert the top 3 failures into the next `0.3.x` release.
