<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-89b2-6e31a0763ed6" />
</div>

# Dialogic Classroom

Teacher PD game for practising dialogic talk moves with Primary-aged, Malay L1 learners. Built on research by Edwards-Groves, Chapin, O'Connor, and Alexander.

## Run locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set `FIREWORKS_API_KEY` in [.env.local](.env.local) and copy `LLM_PROVIDER="fireworks"` from [.env.example](.env.example). Model routing is configurable through `FIREWORKS_VISION_MODEL`, `FIREWORKS_REASONING_MODEL`, and `FIREWORKS_FALLBACK_MODEL`; see [.env.example](.env.example). By default, Minimax extracts screenshot content and Kimi K3.1 Pro generates the coaching response.
3. Run the app:
   `npm run dev`

## Tests

- `npm test` — unit tests plus server integration tests. The server tests boot the real `server.js` against a local mock LLM endpoint (no API key or network needed).
- `npm run test:e2e` — Playwright smoke test.

## LLM provider (deployment)

`server.js` is provider-agnostic. It is configured only through environment variables:

| `LLM_PROVIDER` | Required variables | Auth |
| --- | --- | --- |
| `azure-openai` (default) | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `REASONING_MODEL` / `VISION_MODEL` / `FALLBACK_MODEL` (deployment names) | `api-key` header |
| `openai-compatible` | `LLM_BASE_URL`, `LLM_API_KEY`, model names | `Authorization: Bearer` |
| `fireworks` | `FIREWORKS_API_KEY` | `Authorization: Bearer` |

The server fails fast at startup for an unapproved `LLM_PROVIDER`, and for `azure-openai` without an endpoint.

> **Required before the next Railway deploy:** the default provider is now `azure-openai`. The current deployment uses Fireworks, so add `LLM_PROVIDER=fireworks` to the Railway service variables (or migrate by setting the `AZURE_*` variables). Without one of these the server exits at startup with a message naming the missing variable.

## Core 6 Strategy Spine (S1–S6)

The Core 6 selector at the top of each coaching tool sends `activeStrategy` to every coaching endpoint (`/api/talk-move-plan`, `/api/lesson-coach`, `/api/live-coach`, `/api/primer`, `/api/concept-cartoon`). The active strategy becomes the primary spotlight of the teacher script, board frames, and follow-up moves, while earlier strategies keep supporting it (cumulative spotlight). The matrix lives in [`core6_strategies.json`](core6_strategies.json) and is shared by the server prompts and the UI.

## Concept Cartoon Studio

`#/cartoon` (or "Concept Cartoon Studio" on the Home hub) calls `POST /api/concept-cartoon`: three fixed characters (Ali, Bisi, Cempaka) with one sound, one misconception, and one language-trap claim. The server randomises which character holds each role on every generation. Speech bubbles are editable text in a code-drawn SVG layout (printable, never rasterised), each with Iban and Sarawak Malay bridges; uncertain technical Iban is flagged with `ibanNeedsTeacherCheck` for the teacher to verify. The endpoint is stateless.

## Privacy

- Keep `VITE_SENTRY_DSN` and `VITE_PLAUSIBLE_DOMAIN` unset unless explicitly approved.
- `/api/lesson-coach`, `/api/live-coach`, and `/api/concept-cartoon` never write to the server disk cache. Only the generic `/api/primer` and `/api/talk-move-plan` responses are cached.
