# Versioning

This document defines how LogPad versions are named, validated, tagged, and published to GitHub.

## Current Stable Version

```text
0.4.1
```

Release tag:

```text
v0.4.1
```

Release line:

```text
creator-control-plane
```

## Version Rule

LogPad uses SemVer-style numbering, adapted for a local creator tool:

- `MAJOR`: breaking workflow, storage, API, or run-file contract changes.
- `MINOR`: new user-facing modules or major workflow capability additions.
- `PATCH`: fixes, hardening, docs, tests, and smaller UX improvements.

Examples:

- `0.4.0`: Voice Inbox and local folder asset indexing become major usable modules.
- `0.4.1`: small UX fixes, extra tests, docs, or bug fixes after `0.4.0`.
- `1.0.0`: LogPad is stable enough for daily production without manual fallback to file browsing.

## Release Checklist

Before tagging:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm audit
```

Also do one browser smoke check for the creator-critical paths:

- `/`
- `/episodes`
- `/episodes/<episode_id>`
- `/episodes/<episode_id>/record`
- `/voice`
- `/assets`
- `/distribution`

## Release Steps

1. Update `package.json` version.
2. Update `CHANGELOG.md`.
3. Update `README.md` current version section when needed.
4. Update `DEVELOPMENT_PLAN.md` and `REVIEW_REPORT.md` if the score or acceptance status changed.
5. Run the release checklist.
6. Commit:

```bash
git add .
git commit -m "Release LogPad v0.4.1"
```

7. Tag:

```bash
git tag -a v0.4.1 -m "LogPad v0.4.1"
```

8. Push:

```bash
git push origin main
git push origin v0.4.1
```

9. Create or update the GitHub release from the changelog entry.

## Git Branch Policy

- `main`: stable local usable version.
- Feature branches: optional for larger isolated work.
- Tags: every stable handoff version should have a `vX.Y.Z` tag.

For Wilson's local workflow, `main` can remain direct as long as every release commit is validated and tagged.

## Release Boundary

A version is not considered complete unless it is present in all four places:

- `package.json`
- `CHANGELOG.md`
- Git tag
- GitHub remote

If a material workflow decision changed, also write it back to:

- `DEVELOPMENT_PLAN.md`
- `REVIEW_REPORT.md`
- `/Users/wilsonlu/Desktop/Ai/media/media-codex/handoff/CURRENT_STATUS.md`

## Rollback

To inspect a previous release:

```bash
git checkout v0.4.1
```

To return to active development:

```bash
git checkout main
```

Avoid destructive resets. If rollback is needed for real use, create a new fix commit on `main` instead of rewriting public history.
