# Plan: Live Coach → action_mode discriminated-union refactor

## Context & goal
`LiveCoach` (the "Speed Planner" tab) is a point-of-friction intervention tool for EAL/ESL
classrooms, not a lesson planner. The current live-coach schema/prompt straightjackets the LLM:
it forces a Talk Move + 3-step `microAdaptation` on every turn, even when the honest answer is
"diagnose the barrier" or "reset and model the concept." Goal: un-straightjacket the model via an
`actionMode` discriminated union so it can *diagnose* or *reset* WITHOUT forcing a Talk Move, while
keeping proactive idea-surfacing and low-fatigue tappable interaction.

Note: a prior turn already loosened the schema (`coachingPhase` + optional fields + `ideas[]`). This
plan **replaces** that layer with the cleaner discriminated union and **keeps** `ideas[]` (surfacing)
plus a one-line `rationaleNote`.

## Locked decisions
1. **Schema:** discriminated union on `actionMode: "diagnose" | "reset" | "firm_up"`. Mode-specific
   block present only for the chosen mode. `ideas[]` retained; `rationaleNote` added (why this mode,
   not the others). `coachingPhase` and the `microAdaptation` wrapper are removed (frames move into
   `firmUp.bilingualSentenceFrames`, the Malay/Iban teacher tip becomes optional `firmUp.phrasingTip`).
2. **EEF + Talk Moves = reference library / strong lens, NOT a mandate.** diagnose/reset may omit any
   Talk Move. The EAL "never laziness/defiance" directive is **interpretive guidance**, not a hard
   prohibition. Taxonomy stays FULLY intact: all 9 `diagnosis.barrier` values; `control`/`pacing` stay
   in `readBack.needCategory`.
3. **Prompt reconciliation:** "Choose exactly ONE decisive `actionMode` per turn" AND "`ideas[]` are
   clearly secondary surfaced paths, never the action or an equal menu."
4. **MCQ interaction:** tap a chip → fills the draft textarea (editable) → teacher sends manually.
   Free-text reply box stays. `clarifyingOptions` fill verbatim; `ideas` fill with their `headline`.
5. **Migration/safety:** bump localStorage key to `tmb.live.messages.v2` and add a cache-key version
   tag so stale old-shape results never reach the new renderer. Sanitizer normalizes `actionMode` and
   keeps only the matching mode-block. Frontend renders by `actionMode` switch with a graceful fallback.

## Target schema (discriminated union)
```js
{
  actionMode: "diagnose" | "reset" | "firm_up",
  readBack:   { detectedLanguage: string, needCategory: "pacing"|"control"|"scaffolding"|"mixed",
                summaryEnglish: string, summaryBridge: string },
  diagnosis:  { barrier: <one of all 9 existing values>, confidence: number, evidence: string },
  teacherMirror: string,      // the EAL reframe, e.g. "copying = reading barrier, not laziness"
  rationaleNote: string,      // ONE line: why this mode now, not the others
  observeNext?: string,
  ideas?: Idea[],             // KEEPS surfaced tappable options; Idea shape unchanged

  // present only for the chosen actionMode:
  diagnose?: {
    hypothesis: string,              // distinguishes cognitive (content) vs linguistic (output)
    clarifyingQuestion: string,      // ONE question
    clarifyingOptions: string[]      // 2-4 tappable MCQ chips (fill draft verbatim)
  },
  reset?: {
    eefPrinciple: { principleId, principle, whyThisFits, checkAdaptAction },  // reuses old evidenceLink
    resetActionSteps: string[]       // modeling/foundations steps
  },
  firmUp?: {
    eefRationale: string,
    talkMove: { talkMoveId, offPalette?, talkMoveName, why, sayNowEnglish, sayNowBridge },  // old step1
    bilingualSentenceFrames: Array<{ en: string, bridge: string }>,
    phrasingTip?: { tipMalay: string, tipIban: string, whenToUse: string }   // optional, old step3
  },

  regainFocusLine?: string,   // optional; control/pacing friction only
  ifItFails?: string
}
// Idea (unchanged): { kind, headline, detail, talkMoveId?, offPalette?, sayNowEnglish?, sayNowBridge? }
```

## Tasks (ordered)

### 1. server.js — rewrite `buildLiveCoachSystemInstruction()` (~L737)
- Lead with the EAL lens: "You are an instructional coach for EAL/ESL classrooms. Never interpret
  disengagement/silence/copying as defiance or laziness; treat it as cognitive overload or a language
  barrier FIRST. Taxonomy still allows pacing/control/motivation when genuinely warranted."
- Keep injecting `BILINGUAL_INTENT_INSTRUCTIONS`, `EEF_INCLUSIVE_TEACHING_BRIEF`, `TALK_MOVE_PALETTE`,
  but reframe as a **reference library**: "Do not force a Talk Move into every response. If the teacher
  needs to model (reset) rely on EEF and leave the Talk Move out. If students need to verbalize to
  reduce writing pressure (firm_up), pick the most appropriate Talk Move."
- Define the 3 modes and when each fires:
  - `diagnose` → freeze/disengage/ambiguous: return hypothesis (cognitive vs linguistic) + ONE
    clarifying question + 2-4 `clarifyingOptions`. No Talk Move.
  - `reset` → approach needs pulling back to foundations: EEF-backed modeling strategy +
    `resetActionSteps`. No Talk Move.
  - `firm_up` → students must make thinking visible: `eefRationale` + Talk Move + bilingual frames.
- Hard rules: "Choose exactly ONE actionMode per turn. Do not provide lists of options AS the action.
  `ideas[]` (0-3) are secondary surfaced paths only, never the action or an equal menu." Keep length
  caps; keep "off-palette" allowance for `firmUp.talkMove` and `alternative-move` ideas.
- Output JSON-only with the union shape above; "omit optional fields rather than empty strings; a
  mode-block must match the chosen actionMode."

### 2. server.js — rewrite `sanitizeLiveCoach()` (~L510)
- Normalize `actionMode` to one of the three; if missing/invalid, infer from whichever mode-block is
  populated, else default `"diagnose"`.
- Keep only the mode-block matching the (normalized) `actionMode`; drop any mismatched mode-block.
- Preserve `readBack`, `diagnosis` (all 9 barriers), `teacherMirror`, `rationaleNote`, `observeNext?`,
  `ideas?` (reuse `sanitizeIdea`), `regainFocusLine?`, `ifItFails?`.
- Mode blocks:
  - `diagnose`: require `hypothesis` + `clarifyingQuestion`; `clarifyingOptions` = up to 4 non-empty.
  - `reset`: require `eefPrinciple.principleId`; `resetActionSteps` = up to 5.
  - `firmUp`: `talkMove` may be off-palette (keep `offPalette` flag); `bilingualSentenceFrames` map to
    `{en, bridge}` pairs, drop pairs missing both; `phrasingTip` optional.
- If a required mode field is empty after sanitize, still return the object (don't throw) — the
  renderer must degrade gracefully; surface the best partial data.

### 3. server.js — `/api/live-coach` endpoint (~L985) + cache
- No structural change to the endpoint; both the single-observation and `thread` paths already produce
  whatever the sanitizer returns. Confirm both still work with the new schema.
- `buildLiveCoachContents` (~L761) unchanged (teacher→user, coach→model).
- Add a **version tag** into `createCacheKey` calls for live-coach/live-coach-thread (e.g. prefix
  `'live-coach:v2'`) so cached old-shape plans are never served to the new frontend.

### 4. LiveCoach.tsx — types + renderer + tappable chips
- Rewrite `LiveCoachResult` to the union shape above.
- Bump persistent state key: `usePersistentState('tmb.live.messages.v2', [])` (discard old
  `tmb.live.messages`). Keep `yearLevel/subject/dominantLanguage` keys.
- `CoachReply` renders by `result.actionMode`:
  - Always: `teacherMirror`, `rationaleNote`, `readBack`, `diagnosis` (reuse existing badges/styles).
  - `diagnose`: prominent hypothesis card + clarifying question + `clarifyingOptions` as tappable chips.
  - `reset`: EEF principle card (reuse `evidenceLink` styling) + ordered `resetActionSteps`.
  - `firmUp`: Talk Move card (with `offPalette` tag) + bilingual frame rows (EN + bridge, copy buttons)
    + optional `phrasingTip` lines.
  - Optional `ideas[]` as tappable chips (after the mode block), `observeNext`, `regainFocusLine`/`ifItFails`.
- **Chip tap handler:** set the draft textarea to the chip text (`clarifyingOptions` verbatim; `idea.headline`)
  and focus it. Do NOT auto-send (manual send confirmed). Reuse the existing `send()` path.
- **Graceful fallback:** unknown/missing `actionMode` → render only `teacherMirror` + a neutral note;
  never crash. Guard every optional field with `?.`/`length` checks.
- Add a small mode badge ("Diagnose"/"Reset"/"Firm up") near the reply header.

### 5. i18n (src/lib/i18n.tsx) — EN + MS
- Add keys: `live.mode.diagnose`, `live.mode.reset`, `live.mode.firm_up`, `live.rationaleNote`,
  `live.hypothesis`, `live.clarifyingQuestion`, `live.clarifyingOptions`, `live.resetSteps`,
  `live.firmUp.rationale`, `live.bilingualFrames`, `live.tapHint` ("Tap an option to fill your reply"),
  plus any mode-header labels. Remove now-unused keys only if nothing else references them (safe to
  leave; lint won't flag unused i18n keys).

### 6. Validation
- `npx tsc --noEmit` (the repo `lint` script) — must be clean.
- `npm run build` — must succeed (ignore pre-existing chunk-size warning).
- `npm test` (vitest) — existing 25 tests must stay green.
- **Manual smoke (cannot run here — no GEMINI_API_KEY):** with a real key, verify on the user's
  copying/reading-barrier scenario that turn 1 yields `actionMode: "diagnose"` with a hypothesis +
  clarifying options, and that tapping a chip fills the draft and the follow-up turn switches to
  `firm_up`/`reset`. Confirm ideas render and ideas from `reset` omit Talk Moves.

## Risks / open questions
- **Live model behavior is unverified** without an API key in this sandbox. The plan enforces safety
  via the sanitizer (normalize + keep-only-matching-block) and the frontend fallback, but whether the
  model reliably picks `diagnose` on freeze and surfaces useful ideas must be checked in the smoke test.
- **One-time conversation loss:** bumping `tmb.live.messages` → `v2` discards in-progress old-shape
  conversations on upgrade. Acceptable (scratch data); documented.
- **Schema breadth vs. straightjacket:** the union + ideas + rationale is broader than a strict
  single-shape schema by design. If the model starts padding, tighten by lowering idea max (4→3) or
  making `rationaleNote` optional first — do NOT re-add forced fields.
