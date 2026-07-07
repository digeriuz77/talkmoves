# Coaching Improvement Plan: From Single-Shot Outputs to Adaptive Teacher Coaching

## Current coaching model

Talk Moves already has the foundations of a teacher coach rather than a generic prompt wrapper:

- **Scenario rehearsal:** teachers practise talk-move choices in simulated classroom moments.
- **Plan generation:** teachers can generate a dialogic scaffolding map from a question, year level, subject, class profile, and vocabulary.
- **Lesson interrogation:** teachers can paste or upload a lesson plan and receive EAL risk moments, pacing breaks, bridge-language supports, and hinge questions.
- **Live coach:** teachers can describe what is happening in the room and receive a three-step micro-adaptation.

The main limitation is that the AI endpoints currently return a finished answer in one pass. The app reads the teacher's input, generates a plan, and stops. That is fast, but it does not yet create a coaching loop where the teacher and system jointly diagnose the classroom situation, choose a move, observe the result, and refine the next move.

## Best next product direction

The best improvement is not to add a long intake form. Teachers in the target context need immediate classroom help, especially when EAL pupils or below-average readers are blocked. The app should become a **diagnostic action loop**:

1. **Teacher describes the situation in plain language.**
2. **The system infers the most likely bottleneck.**
3. **The system asks at most one or two critical diagnostic questions only when the answer would change the move.**
4. **The system mirrors the situation back in teacher-friendly language.**
5. **The system gives two or three concrete moves with exact wording, sentence frames, and a fast fallback.**
6. **The teacher reports what happened.**
7. **The system updates the diagnosis and recommends the next move.**

This keeps the current strength of speed while moving beyond single-shot reasoning.

## Coaching state machine

Add a shared coaching state model for AI-assisted modes:

| State | Purpose | Teacher experience |
| --- | --- | --- |
| `intake` | Capture a messy classroom situation or plan concern. | “Tell me what is happening.” |
| `triage` | Classify the bottleneck: access, vocabulary, decoding, comprehension, motivation, participation, pacing, control, or mixed. | System reads back the likely issue. |
| `clarify` | Ask one or two high-value questions only if needed. | “Before I suggest the move: is the barrier reading the words, understanding instructions, or knowing what to say?” |
| `action` | Give immediate moves. | Exact teacher lines, pupil frames, timing, fallback. |
| `observe` | Ask what happened after the move. | “Did pupils answer, stay silent, copy, or go off-task?” |
| `refine` | Adapt the next move from observed outcome. | “Because they copied but did not explain, switch to partner rehearsal plus revoicing.” |

The state machine can live on the client first using persisted local state, then later become a server-side session if accounts or analytics are added.

## Minimal implementation path

### Phase 1: Structured response without major architecture change

Keep the current Express and Gemini architecture, but change the live-coach response schema to include:

- `diagnosis`: the inferred barrier and confidence level.
- `missingCriticalInfo`: zero to two questions, only when needed.
- `teacherMirror`: a short restatement of the classroom situation.
- `moves`: two or three candidate moves, each with:
  - exact teacher wording,
  - pupil sentence frames,
  - when to use it,
  - why it fits this situation,
  - what to do if it fails.
- `observeNext`: the one observable sign the teacher should look for.

This can be implemented in the existing `/api/live-coach` endpoint by expanding the prompt, sanitizer, and React result UI.

### Phase 2: Add follow-up turns

Add a `followUpObservation` text box below each generated live-coach answer:

> “What happened when you tried it?”

Send the previous `diagnosis`, chosen move, and follow-up observation back to the server. The endpoint can return a refined action. This creates a coaching loop without requiring user accounts, recordings, or a complex backend.

### Phase 3: Make coaching evidence visible

The app will stand out more if it shows teachers the observable pattern, not just the advice. Add small labels such as:

- “Barrier detected: instruction comprehension”
- “Move type: reduce language load, keep reasoning demand”
- “Watch for: pupils explain to a partner before writing”

This mirrors the TalkMoves principle of recognising specific behaviour rather than giving vague coaching.

## What can go further without significant change?

A lot can be improved without rebuilding the app:

- The existing `LiveCoach` already accepts open-text observations and returns immediate micro-adaptations.
- The existing server already has separate prompt builders and sanitizers, so richer schemas can be added incrementally.
- The app already persists local state, so a lightweight follow-up loop can be added without authentication.
- The talk-move palette already constrains AI outputs to concrete pedagogical moves rather than generic advice.

The main required change is **product logic**, not infrastructure: stop treating each AI call as a final answer and start treating it as one turn in a short diagnostic-action-observation cycle.

## Recommended differentiator

Position the app as a **classroom-speed EAL and reading-access coach**:

> “Describe the problem in your room. Get a fast diagnosis, a move to try now, and a next move based on what happened.”

That is stronger than “write a better prompt” because it operationalises coaching as a repeatable workflow. It is also stronger than a generic AI coach because every output is tied to observable classroom barriers, dialogic talk moves, bridge-language supports, and pupil sentence frames.
