// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)

/**
 * Canonical schema for non-generative KPM textbook vocabulary,
 * Concept Cartoons, and Odd One Out reasoning sets.
 *
 * Keep unit files as pure JSON-compatible data in src/data/curriculum/.
 */

export type VocabTier = 'tier3' | 'tier2' | 'connector';

export type CurriculumWord = {
  /** Stable unique ID, e.g. 'y4-sci-u4-photosynthesis' */
  id: string;
  /** Target English word or short phrase */
  word: string;
  /** 'tier3' = science content, 'tier2' = thinking/process, 'connector' = causal glue */
  tier: VocabTier;
  /** Concrete EAL-friendly meaning (aim for under 15 words) */
  kidDefinition: string;
  /** Bahasa Melayu / Sarawak Malay bridge equivalent */
  bridgeMalay: string;
  /** Optional Iban bridge (only include when verified) */
  bridgeIban?: string;
  /** True if English and Malay share a recognizable root/form */
  isCognate: boolean;
  /** Optional short note highlighting the cognate link */
  cognateNote?: string;
  /** Short oral caller clue for Bingo, Flyswatter, and Hot Seat */
  clue: string;
  /** Optional quick classroom physical action to anchor memory */
  gesture?: string;
  /** KPM textbook page reference, e.g. 'p. 77' */
  textbookPage?: string;
};

export type ConceptCartoonStudentId = 'studentA' | 'studentB' | 'studentC' | 'studentD';

export type ConceptCartoonClaim = {
  studentId: ConceptCartoonStudentId;
  studentName: string;
  /** Short, plausible spoken pupil claim in plain English */
  claimEn: string;
  /** Malay/Iban bridge version of the claim */
  claimBridge: string;
  /** Teacher diagnostic tag (hidden from pupils during projection) */
  diagnosticTag: 'target' | 'misconception' | 'surface';
  /** Teacher-only note explaining the reasoning or misconception */
  explanation: string;
};

export type ConceptCartoon = {
  id: string;
  title: string;
  /** KPM curriculum standard code, e.g. '4.2.2 / 4.2.3' */
  kpmStandard: string;
  /** KPM textbook page reference, e.g. 'p. 86' */
  textbookPage: string;
  /** Short scene setup anchoring pupils to the textbook diagram */
  stimulusPromptEn: string;
  stimulusPromptBridge: string;
  /** 3 or 4 equal-status competing pupil claims */
  claims: ConceptCartoonClaim[];
  /** Dialogic launch question for the teacher */
  talkMovePromptEn: string;
  talkMovePromptBridge: string;
  /** Board-ready pupil sentence frames */
  sentenceFrames: string[];
};

export type OddOneOutSet = {
  id: string;
  title: string;
  kpmStandard: string;
  textbookPage: string;
  /** 3 or 4 words/concepts to compare */
  items: Array<{ word: string; bridgeMalay: string }>;
  promptEn: string;
  promptBridge: string;
  /** Multiple defensible reasons (encourages reasoning over single-answer recall) */
  possibleReasons: Array<{ chosenWord: string; reason: string }>;
  talkMovePrompt: string;
};

export type CurriculumLesson = {
  id: string;
  /** KPM content standard code, e.g. '4.1' */
  code: string;
  title: string;
  titleMs?: string;
  pages: string;
  wordIds: string[];
  conceptCartoonIds: string[];
  oddOneOutIds: string[];
};

export type CurriculumUnit = {
  id: string;
  yearLevel: string;
  subject: string;
  unitNumber: number;
  /** KPM label shown in unit navigation, e.g. 'Unit 4' */
  kpmCode: string;
  title: string;
  titleMs: string;
  pages: string;
  lessons: CurriculumLesson[];
  words: CurriculumWord[];
  conceptCartoons: ConceptCartoon[];
  oddOneOutSets: OddOneOutSet[];
};
