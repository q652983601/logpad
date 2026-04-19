# Asset Library Blueprint

> Version: v0.4.0
> Date: 2026-04-19

## Final Product Shape

The asset library is Wilson's local media index for real-person production.

It supports two ways to add material:

1. Upload files into LogPad when the asset should live inside the app.
2. Index a local folder when the asset already lives somewhere on disk and should not be copied.

Local folder indexing is designed for large video, audio, and image folders. LogPad stores the absolute local path as an index record, then previews the file through a local API route. Deleting the LogPad record removes only the index entry. It does not delete Wilson's original file.

## Supported Assets

- Images: jpg, jpeg, png, webp, gif
- Video: mp4, mov, m4v, webm
- Audio: mp3, m4a, wav, aac, ogg

Each indexed file keeps:

- file name
- type
- MIME type
- size
- source tag
- optional episode link
- original local path
- status

## Implementation Status

| Capability | Status |
|---|---|
| Upload assets into LogPad | Shipped |
| Index a local folder without copying files | Shipped |
| Skip duplicate local paths | Shipped |
| Preview indexed local files through LogPad | Shipped |
| Range streaming for audio/video seeking | Shipped |
| Deleting local index without deleting original file | Shipped |
| Episode-specific folder presets | Planned |
| Write indexed assets into `05-assets/asset_manifest.json` | Planned |
| Rights/privacy review workflow per asset | Planned |

## Human Gate

Indexing a folder does not mean an asset is approved for publishing. Before an asset is used publicly, Wilson still needs a rights/privacy check for faces, voices, screenshots, copyrighted music, third-party footage, private data, and brand-sensitive material.

## Why It Matters

The app can now work with real local production folders instead of forcing every material into an upload flow. This makes the asset library useful for camera files, screen recordings, voice notes, rough cuts, and Remotion exports while keeping the original folder structure intact.
