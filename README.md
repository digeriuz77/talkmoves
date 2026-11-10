<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Dialogic Classroom

Teacher PD game for practising dialogic talk moves with Primary-aged, Malay L1 learners. Built on research by Edwards-Groves, Chapin, O'Connor, and Alexander.

## Run locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `FIREWORKS_API_KEY` in [.env.local](.env.local). Model routing is configurable through `FIREWORKS_VISION_MODEL`, `FIREWORKS_REASONING_MODEL`, and `FIREWORKS_FALLBACK_MODEL`; see [.env.example](.env.example). By default, Minimax extracts screenshot content and Kimi K3.1 Pro generates the coaching response.
3. Run the app:
   `npm run dev`
