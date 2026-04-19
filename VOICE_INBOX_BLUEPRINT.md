# Voice Inbox Blueprint

> Version: v0.4.0
> Date: 2026-04-19

## Final Product Shape

Voice Inbox is the capture and thinking layer before a formal episode exists.

Wilson can:

1. Record a scattered thought on phone or recorder.
2. Upload the audio into LogPad.
3. Transcribe it into text, either by pasting text or by using the local transcription bridge when `OPENAI_API_KEY` and the transcribe CLI are available.
4. Keep each recording as a small note with title, summary, key points, tags, and original audio.
5. Select any set of notes, such as 1/3/5 or 2/4/6, and combine them into a collection.
6. Ask the local Agent to discuss the selected notes into:
   - recommended topic
   - polished core viewpoints
   - theory or paper support that needs source verification
   - audience search pain points
   - platform angle
   - script outline
   - risk points for Wilson to approve
7. Turn the collection into a content-factory episode.

This is not a public publishing surface. It is the private idea bank and topic-formation layer.

## Data Model

### `voice_notes`

- title
- audio path/name/type/size
- transcript
- summary
- key points
- tags
- status
- timestamps

### `voice_collections`

- title
- selected note IDs
- theme
- audience pain
- theory support
- content angle
- draft outline
- local Agent discussion brief
- status
- timestamps

## Implementation Status

| Capability | Status |
|---|---|
| Audio/text note creation | Shipped |
| Audio file storage under `/uploads/voice/` | Shipped |
| Manual transcript save and summary extraction | Shipped |
| Optional local transcription bridge | Shipped, requires `OPENAI_API_KEY` and transcribe CLI |
| Select arbitrary notes and create a collection | Shipped |
| Local Agent discussion prompt and writeback | Shipped |
| Convert collection into an episode | Shipped |
| Source-verified paper search | Planned |
| Search trend/pain-point live research | Planned |
| Apply Agent output directly into script sections | Planned |

## Human Gate

Agent output can suggest theories and papers, but it must not be treated as verified citation truth until a separate research/source pass confirms it.

## Next Quality Bar

The feature is production-useful when:

- Wilson can upload 10+ voice notes without losing context.
- A selected collection can become a usable episode brief in under 3 minutes.
- The Agent discussion produces useful topic structure without pretending that sources are verified.
- The next research pass can attach actual source links, theory names, and paper claims.
