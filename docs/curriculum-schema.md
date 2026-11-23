# KPM Curriculum Schema Reference

Reference guide for authoring non-generative KPM textbook units (vocabulary lists, Odd One Out sets, and code-rendered Concept Cartoons) compatible with Talk Moves.

- **TypeScript types**: `src/data/curriculum/types.ts`
- **Reference pilot unit**: `src/data/curriculum/y4-science-unit4-plants.ts` (Year 4 Science DLP, Unit 4: Plants, pp. 69–86)
- **Unit registry**: `src/data/curriculum/index.ts`

---

## How to Add a New Unit

1. Create a new file in `src/data/curriculum/`, e.g. `y4-science-unit1-scientific-skills.ts`, exporting a `CurriculumUnit` object.
2. Import and add it to the `curriculumUnits` array in `src/data/curriculum/index.ts`.

No database, migration, or AI image generation is required. The unit immediately appears in **Vocab & Cartoons -> KPM Units** with flippable Bingo, Flyswatter, Hot Seat, Flip Cards, Odd One Out, Concept Cartoons, and 50/30/20 spaced retrieval (`Quick-Fire 5`).

---

## 1. Unit Container (`CurriculumUnit`)

```json
{
  "id": "y4-science-u4-plants",
  "yearLevel": "4",
  "subject": "science",
  "unitNumber": 4,
  "kpmCode": "Unit 4",
  "title": "Plants",
  "titleMs": "Tumbuhan",
  "pages": "pp. 69–86",
  "lessons": [
    {
      "id": "y4-sci-u4-l1",
      "code": "4.1",
      "title": "Plant Responses to Stimuli",
      "titleMs": "Gerak Balas Tumbuhan Terhadap Rangsangan",
      "pages": "pp. 69–75",
      "wordIds": ["y4-u4-stimuli", "y4-u4-roots"],
      "conceptCartoonIds": ["y4-u4-cc-roots-water"],
      "oddOneOutIds": ["y4-u4-ooo-parts"]
    }
  ],
  "words": [],
  "conceptCartoons": [],
  "oddOneOutSets": []
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | Yes | Unique slug, e.g. `y4-science-u2-humans` |
| `yearLevel` | Yes | String `'1'`–`'10'` (matches KPM Year level) |
| `subject` | Yes | Lowercase key (`'science'`, `'maths'`, `'english'`, etc.) |
| `unitNumber` | Yes | Numeric unit order (`1`, `2`, `3`, ...) |
| `kpmCode` | Yes | Short pill label shown in UI, e.g. `'Unit 4'` |
| `title` / `titleMs` | Yes | English and Bahasa Melayu unit titles |
| `pages` | Yes | Textbook page range, e.g. `'pp. 69–86'` |
| `lessons` | Yes | Sub-topics by KPM content standard (`4.1`, `4.2`, ...) linking `wordIds`, `conceptCartoonIds`, and `oddOneOutIds` |

---

## 2. Vocabulary Word (`CurriculumWord`)

```json
{
  "id": "y4-u4-photosynthesis",
  "word": "photosynthesis",
  "tier": "tier3",
  "kidDefinition": "The process plants use to make their own food using sunlight, water, and air.",
  "bridgeMalay": "fotosintesis",
  "bridgeIban": "",
  "isCognate": true,
  "cognateNote": "Photo (light) + synthesis (putting together) = fotosintesis.",
  "clue": "The big word for how green plants cook their own food in sunlight.",
  "gesture": "Hold palms up to catch sunlight, then stir a pretend pot of food.",
  "textbookPage": "p. 76"
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | Yes | Stable unique ID (used by local spaced-retrieval tracking—do not rename once published) |
| `word` | Yes | English target word or short phrase |
| `tier` | Yes | `'tier3'` (science content), `'tier2'` (thinking/process words like *observe, predict, hypothesis*), or `'connector'` (causal glue like *because, towards, therefore*) |
| `kidDefinition` | Yes | Concrete, jargon-free definition (aim for under 15 words; shown on Flip Cards, Flippable Bingo tiles, and Caller Deck) |
| `bridgeMalay` | Yes | Bahasa Melayu / Sarawak Malay equivalent |
| `bridgeIban` | No | Include only when verified; omit if uncertain |
| `isCognate` | Yes | `true` when English and Malay share a recognizable root/form |
| `cognateNote` | No | Brief explanation of the cognate link |
| `clue` | Yes | Oral caller clue for Bingo, Flyswatter, and Hot Seat |
| `gesture` | No | Physical action cue for Primary EAL memory anchoring |
| `textbookPage` | No | Page reference, e.g. `'p. 76'` |

---

## 3. Concept Cartoon (`ConceptCartoon`)

Rendered in-app with the illustrated SVG pupil cast—no raster image assets needed.

| `studentId` | Default Name | Character |
|---|---|---|
| `'studentA'` | Aina | Teal tudung, coral cardigan |
| `'studentB'` | Bala | Curly hair, marigold shirt |
| `'studentC'` | Chong | Rounded glasses, sky-blue shirt |
| `'studentD'` | Dina | Berry/plum shirt |

```json
{
  "id": "y4-u4-cc-black-box",
  "title": "Plant N Inside the Black Box",
  "kpmStandard": "4.2.2 / 4.2.5",
  "textbookPage": "p. 86 (Mind Test Q7)",
  "stimulusPromptEn": "Look at Plants M and N on p. 86. Both get the SAME amount of water and sit in the sun, but Plant N is covered by a black box for three days.",
  "stimulusPromptBridge": "Lihat Tumbuhan M dan N di m/s 86. Kedua-duanya mendapat jumlah air yang SAMA di bawah matahari, tetapi Tumbuhan N ditutup kotak hitam selama tiga hari.",
  "claims": [
    {
      "studentId": "studentA",
      "studentName": "Aina",
      "claimEn": "Plant N will stay healthy and green because it still has plenty of water and soil.",
      "claimBridge": "Tumbuhan N akan kekal sihat dan hijau kerana ia masih ada air dan tanah yang cukup.",
      "diagnosticTag": "misconception",
      "explanation": "Soil-is-food misconception; ignores that sunlight is required for photosynthesis."
    },
    {
      "studentId": "studentB",
      "studentName": "Bala",
      "claimEn": "Plant N will turn yellow and wilt because the black box blocks sunlight, so it cannot carry out photosynthesis.",
      "claimBridge": "Tumbuhan N akan menjadi kuning dan layu kerana kotak hitam menghalang cahaya matahari, jadi ia tidak dapat berfotosintesis.",
      "diagnosticTag": "target",
      "explanation": "Target causal inference linking blocked sunlight -> no photosynthesis -> weak plant."
    },
    {
      "studentId": "studentC",
      "studentName": "Chong",
      "claimEn": "Plant N will grow stronger because the black box keeps it cool and safe from the hot sun.",
      "claimBridge": "Tumbuhan N akan tumbuh lebih kuat kerana kotak hitam melindunginya daripada panas matahari.",
      "diagnosticTag": "surface",
      "explanation": "Everyday human analogy (shade feels cool) misapplied to plants."
    }
  ],
  "talkMovePromptEn": "Vote with 1, 2, or 3 fingers on your chest. Then use 'because' to explain your prediction for Plant N.",
  "talkMovePromptBridge": "Undi dengan 1, 2, atau 3 jari di dada. Kemudian guna perkataan 'kerana / because' untuk terangkan ramalan kamu bagi Tumbuhan N.",
  "sentenceFrames": [
    "I predict Plant N will ___ because ___.",
    "Both plants have ___, therefore the difference must be ___."
  ]
}
```

**Design guidelines for high-accuracy Concept Cartoons**:
- Include **3 or 4** equal-status claims (`1` `'target'` + `2–3` `'misconception'` / `'surface'` traps).
- Keep claims short, plausible, and written in pupil voice so the scientific answer is not obviously longer or more formal than the distractors.
- Anchor `stimulusPromptEn` to a concrete textbook diagram/page (`textbookPage`) pupils already have open.
- `diagnosticTag` and `explanation` appear only inside the collapsible teacher notes drawer and are hidden in fullscreen projector mode.

---

## 4. Odd One Out (`OddOneOutSet`)

Best when **more than one choice is scientifically defensible**, shifting pupils from answer-hunting to causal reasoning.

```json
{
  "id": "y4-u4-ooo-needs-products",
  "title": "Needs vs Products",
  "kpmStandard": "4.2.2 / 4.2.3",
  "textbookPage": "p. 77–78",
  "items": [
    { "word": "Sunlight", "bridgeMalay": "Cahaya matahari" },
    { "word": "Water", "bridgeMalay": "Air" },
    { "word": "Carbon dioxide", "bridgeMalay": "Karbon dioksida" },
    { "word": "Oxygen", "bridgeMalay": "Oksigen" }
  ],
  "promptEn": "Which one is the Odd One Out? There is more than one good answer—explain your reason!",
  "promptBridge": "Mana satu yang ganjil? Ada lebih daripada satu jawapan betul—terangkan sebab kamu!",
  "possibleReasons": [
    {
      "chosenWord": "Oxygen",
      "reason": "Oxygen is a PRODUCT released by photosynthesis; the other three are NEEDS going in."
    },
    {
      "chosenWord": "Sunlight",
      "reason": "Sunlight is energy (not matter); water, carbon dioxide, and oxygen are matter."
    },
    {
      "chosenWord": "Water",
      "reason": "Water enters through the roots as a liquid; the others enter or leave through the leaves."
    }
  ],
  "talkMovePrompt": "Who chose a DIFFERENT odd one out and can give a science reason for it?"
}
```
