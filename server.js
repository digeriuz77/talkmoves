import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PRIMARY_MODEL_NAME = 'gemma-4-31b-it';
const FALLBACK_MODEL_NAME = 'gemma-3-27b-it';
const PRIMARY_MODEL_LIMIT = 1000;
const PRIMARY_MODEL_SWITCH_THRESHOLD = 950;
const FALLBACK_MODEL_LIMIT = 150000;

const DATA_DIR = path.join(__dirname, '.kilo');
const COUNTERS_PATH = path.join(DATA_DIR, 'model-usage-counters.json');
const CACHE_PATH = path.join(DATA_DIR, 'talk-move-plan-cache.json');
const CACHE_MAX_ENTRIES = 800;
const CACHE_TTL_DAYS = 14;

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDirFor(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function getUtcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCounters(state) {
  const date = getUtcDateKey();
  if (!state || state.date !== date) {
    return { date, proCalls: 0, flashCalls: 0 };
  }
  return {
    date,
    proCalls: Number(state.proCalls || 0),
    flashCalls: Number(state.flashCalls || 0),
  };
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function createCacheKey(kind, normalized) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ kind, normalized }))
    .digest('hex');
}

const TALK_MOVES_PATH = path.join(__dirname, 'talk_moves.json');
const talkMovesData = readJson(TALK_MOVES_PATH, null);

function buildTalkMovePalette() {
  const quick = Array.isArray(talkMovesData?.quick_reference_table)
    ? talkMovesData.quick_reference_table
    : [];
  const detailById = new Map(
    (Array.isArray(talkMovesData?.teacher_talk_moves) ? talkMovesData.teacher_talk_moves : []).map(
      (move) => [move.id, move],
    ),
  );
  const teacherMoves = quick
    .filter((move) => move.teacher_cue)
    .map((move) => {
      const detail = detailById.get(move.id);
      const purpose = detail?.purpose ? ` Purpose: ${normalizeText(detail.purpose).slice(0, 140)}` : '';
      return `- ${move.id} ${move.name} | Cue: "${move.teacher_cue}"${purpose}`;
    });
  const studentMoves = quick
    .filter((move) => move.student_cue)
    .map((move) => `- ${move.id} ${move.name} | Student frame: "${move.student_cue}"`);
  return [
    'TEACHER TALK MOVE PALETTE (the only talk move IDs you may reference):',
    ...teacherMoves,
    'STUDENT TALK MOVE FRAMES (use as sentence-frame targets so STUDENTS do the linguistic heavy lifting):',
    ...studentMoves,
  ].join('\n');
}

const TALK_MOVE_PALETTE = buildTalkMovePalette();

const BILINGUAL_INTENT_INSTRUCTIONS = [
  'The teacher may write in English, Bahasa Melayu, Sarawak Malay, or Iban (often informally or mixed). Understand all of them.',
  'Silently detect the input language AND the underlying coaching need behind the words:',
  '- "pacing" = lesson timing trouble (running out of time, rushing, dead air, activities dragging).',
  '- "control" = classroom management trouble (noise, off-task pupils, silence as resistance, losing the room).',
  '- "scaffolding" = language/quality-talk trouble (pupils cannot say it in English, one-word answers, teacher doing all the talking).',
  'Context: Sarawak primary classrooms; pupils are EAL learners with weak English whose home languages are Iban and Sarawak Malay.',
  'Prime directive: move the teacher AWAY from teacher-talk-heavy IRF patterns. Every suggestion must transfer linguistic work to pupils through the palette moves and student sentence frames.',
  'If uncertain about exact Iban wording, use Sarawak Malay as the bridge language; never fabricate uncertain Iban.',
].join('\n');

function pruneCache(cache) {
  const now = Date.now();
  const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  const entries = Object.entries(cache || {}).filter(([, value]) => {
    const createdAt = Number(value?.createdAt || 0);
    return createdAt > 0 && now - createdAt <= ttlMs;
  });

  entries.sort((a, b) => Number(b[1].createdAt) - Number(a[1].createdAt));
  const kept = entries.slice(0, CACHE_MAX_ENTRIES);
  return Object.fromEntries(kept);
}

function safeParseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function sanitizePlan(data) {
  const plan = data && typeof data === 'object' ? data : {};
  const anticipatedAnswersRaw = Array.isArray(plan.anticipatedAnswers) ? plan.anticipatedAnswers : [];
  const followUpMapRaw = Array.isArray(plan.followUpMap) ? plan.followUpMap : [];

  return {
    coreQuestion: {
      clearEnglish: normalizeText(plan?.coreQuestion?.clearEnglish),
      bridgeMalayOrSarawak: normalizeText(plan?.coreQuestion?.bridgeMalayOrSarawak),
    },
    anticipatedAnswers: anticipatedAnswersRaw
      .map((item) => ({
        likelyIbanOrSarawakMalay: normalizeText(item?.likelyIbanOrSarawakMalay),
        likelySimpleEnglish: normalizeText(item?.likelySimpleEnglish),
        conceptGap: normalizeText(item?.conceptGap),
      }))
      .filter(
        (item) =>
          item.likelyIbanOrSarawakMalay || item.likelySimpleEnglish || item.conceptGap,
      )
      .slice(0, 6),
    talkMove1Revoicing: {
      teacherSaysEnglish: normalizeText(plan?.talkMove1Revoicing?.teacherSaysEnglish),
      teacherSaysBridgeMalayOrSarawak: normalizeText(
        plan?.talkMove1Revoicing?.teacherSaysBridgeMalayOrSarawak,
      ),
    },
    talkMove2PressReasoning: {
      questionEnglish: normalizeText(plan?.talkMove2PressReasoning?.questionEnglish),
      questionMalay: normalizeText(plan?.talkMove2PressReasoning?.questionMalay),
    },
    codeSwitchingStrategy: {
      whenToUseBridgeLanguage: normalizeText(plan?.codeSwitchingStrategy?.whenToUseBridgeLanguage),
      whenToReturnEnglish: normalizeText(plan?.codeSwitchingStrategy?.whenToReturnEnglish),
      comfortMove: normalizeText(plan?.codeSwitchingStrategy?.comfortMove),
    },
    targetVocabulary: asStringArray(plan.targetVocabulary).slice(0, 10),
    followUpMap: followUpMapRaw
      .map((item) => ({
        studentAnswerType: normalizeText(item?.studentAnswerType),
        teacherMove: normalizeText(item?.teacherMove),
        nextQuestionEnglish: normalizeText(item?.nextQuestionEnglish),
        nextQuestionMalay: normalizeText(item?.nextQuestionMalay),
      }))
      .filter(
        (item) =>
          item.studentAnswerType ||
          item.teacherMove ||
          item.nextQuestionEnglish ||
          item.nextQuestionMalay,
      )
      .slice(0, 6),
    quickBoardReadyLines: asStringArray(plan.quickBoardReadyLines).slice(0, 8),
    assessmentForLearning: (function () {
      const afl =
        plan.assessmentForLearning && typeof plan.assessmentForLearning === 'object'
          ? plan.assessmentForLearning
          : {};
      const hinge =
        afl.hingeQuestion && typeof afl.hingeQuestion === 'object' ? afl.hingeQuestion : {};
      const validGapTypes = ['vocabulary', 'reasoning', 'misconception', 'confidence'];
      return {
        hingeQuestion: {
          questionEnglish: normalizeText(hinge.questionEnglish),
          questionMalay: normalizeText(hinge.questionMalay),
          responseBranches: (Array.isArray(hinge.responseBranches) ? hinge.responseBranches : [])
            .map((b) => ({
              gapType: validGapTypes.includes(b?.gapType) ? b.gapType : 'vocabulary',
              interpretation: normalizeText(b?.interpretation),
              nextQuestion: normalizeText(b?.nextQuestion),
            }))
            .filter((b) => b.interpretation || b.nextQuestion),
        },
        diagnosticReadingGuide: normalizeText(afl.diagnosticReadingGuide),
        adaptiveActivities: (Array.isArray(afl.adaptiveActivities) ? afl.adaptiveActivities : [])
          .map((a) => ({
            gapType: validGapTypes.includes(a?.gapType) ? a.gapType : 'vocabulary',
            teacherInstruction: normalizeText(a?.teacherInstruction),
            studentTask: normalizeText(a?.studentTask),
            sentenceFrame: normalizeText(a?.sentenceFrame),
          }))
          .filter((a) => a.teacherInstruction || a.studentTask),
        reconvergenceMove: normalizeText(afl.reconvergenceMove),
      };
    })(),
  };
}

function buildSystemInstruction() {
  return [
    'You are a Dialogic Pedagogical Language Bridge expert for EAL classrooms.',
    BILINGUAL_INTENT_INSTRUCTIONS,
    TALK_MOVE_PALETTE,
    'When you name a teacher move anywhere in the output, reference its palette ID and name (e.g., "TM-T03 Revoicing").',
    "Task: transform a teacher's open question into a Dialogic Scaffolding Map that increases student voice, reasoning, and peer-to-peer talk.",
    'Target learners: lower-performing primary pupils transitioning from Malay/Iban into English.',
    'Definition of dialogue to follow: participants position themselves in relation to others, recognise diverse voices, pose open questions, critique/build on ideas, reason together.',
    'Do NOT produce a teacher-dominated IRF script (teacher asks, student replies, teacher judges).',
    'Instead, disturb habitual patterns with dialogic moves such as: Wait, Invite More (Say More), Pass On, Stay Neutral, Include Yourself, Revoicing, Recasting, Add On, Agree/Disagree with reason.',
    'Use simple, short teacher language suitable for live classrooms.',
    'Critical EAL supports to embed: sentence frames, translanguaging allowance, wait-time after question and after student response, and gentle implicit grammar recasts.',
    'If uncertain about exact Iban, use Sarawak Malay as the bridge language; do not fabricate uncertain Iban.',
    'Keep tone warm, neutral, and non-judgemental. Delay praise/evaluation during exploration.',
    'Always output valid JSON only. No markdown. No commentary.',
    'Output keys must match this structure exactly:',
    '{',
    '  "coreQuestion": { "clearEnglish": string, "bridgeMalayOrSarawak": string },',
    '  "anticipatedAnswers": [',
    '    { "likelyIbanOrSarawakMalay": string, "likelySimpleEnglish": string, "conceptGap": string }',
    '  ],',
    '  "talkMove1Revoicing": {',
    '    "teacherSaysEnglish": string,',
    '    "teacherSaysBridgeMalayOrSarawak": string',
    '  },',
    '  "talkMove2PressReasoning": { "questionEnglish": string, "questionMalay": string },',
    '  "codeSwitchingStrategy": {',
    '    "whenToUseBridgeLanguage": string,',
    '    "whenToReturnEnglish": string,',
    '    "comfortMove": string',
    '  },',
    '  "targetVocabulary": string[],',
    '  "followUpMap": [',
    '    {',
    '      "studentAnswerType": string,',
    '      "teacherMove": string,',
    '      "nextQuestionEnglish": string,',
    '      "nextQuestionMalay": string',
    '    }',
    '  ],',
    '  "quickBoardReadyLines": string[],',
    '  "assessmentForLearning": {',
    '    "hingeQuestion": {',
    '      "questionEnglish": string,',
    '      "questionMalay": string,',
    '      "responseBranches": [',
    '        {',
    '          "gapType": "vocabulary" | "reasoning" | "misconception" | "confidence",',
    '          "interpretation": string,',
    '          "nextQuestion": string',
    '        }',
    '      ]',
    '    },',
    '    "diagnosticReadingGuide": string,',
    '    "adaptiveActivities": [',
    '      {',
    '        "gapType": "vocabulary" | "reasoning" | "misconception" | "confidence",',
    '        "teacherInstruction": string,',
    '        "studentTask": string,',
    '        "sentenceFrame": string',
    '      }',
    '    ],',
    '    "reconvergenceMove": string',
    '  }',
    '}',
    'Quality constraints:',
    '- coreQuestion.clearEnglish must be open and reasoning-oriented, not answer-checking.',
    '- anticipatedAnswers should reflect both language limits and concept limits (not only grammar errors).',
    '- talkMove1Revoicing should model precise but simple academic English and include a check-in meaning.',
    '- talkMove2PressReasoning should ask for evidence/reason, with simple Malay translation.',
    '- codeSwitchingStrategy must state exactly when to allow bridge language and when to pivot back to English.',
    '- followUpMap should include at least 5 branches and name specific dialogic moves.',
    '- quickBoardReadyLines should include short sentence frames learners can immediately use.',
    '- hinge question must include explicit gap-type labeling in response branches.',
    '- diagnostic reading guide must distinguish class-level patterns from individual errors.',
    '- adaptive activities must work without printed materials in 5-8 minutes.',
    '- all teacher instructions must have Malay/Iban bridge versions.',
  ].join('\n');
}

function buildUserPrompt(input) {
  const safeVocabulary = Array.isArray(input.vocabulary)
    ? input.vocabulary.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  return [
    `Teacher Question: ${normalizeText(input.question)}`,
    `Year Level: ${normalizeText(input.yearLevel) || 'Year 2'}`,
    `Subject: ${normalizeText(input.subject) || 'General'}`,
    `Dominant Home Language: ${normalizeText(input.dominantLanguage) || 'Iban'}`,
    `Context (special things to consider): ${normalizeText(input.classProfile) || 'Lower-performing pupils; language and concept support needed.'}`,
    `Priority Vocabulary: ${safeVocabulary.join(', ') || 'Use topic-specific assessment vocabulary.'}`,
    'Requirements:',
    '- Keep outputs practical for live teaching.',
    '- Include likely weak-content responses (not only language errors).',
    '- Revoicing must model short, grammatical English with precise vocabulary.',
    '- Include at least one implicit recast example when likely grammar is weak.',
    '- Pressing question must be simple English + Malay translation.',
    '- Include the 2 waits: pause after teacher question and pause after student response.',
    '- Include at least one Pass On / Repeat / Restate move so students respond to each other.',
    '- Include one Stay Neutral move where teacher does not evaluate immediately.',
    '- Include one Include Yourself stance line (e.g., "I’m hearing...", "How can we...").',
    '- Include sentence frames learners can use to agree/disagree, justify, and add on.',
    '- Follow-up map should cover at least five student-response paths.',
  ].join('\n');
}

const VALID_NEED_CATEGORIES = ['pacing', 'control', 'scaffolding', 'mixed'];

function normalizeNeedCategory(value) {
  const v = normalizeText(value).toLowerCase();
  return VALID_NEED_CATEGORIES.includes(v) ? v : 'mixed';
}

function sanitizeLessonCoach(data) {
  const out = data && typeof data === 'object' ? data : {};
  const pacing = out.pacingCoach && typeof out.pacingCoach === 'object' ? out.pacingCoach : {};
  const bridge = out.languageBridge && typeof out.languageBridge === 'object' ? out.languageBridge : {};
  const quickSheet = bridge.quickSheet && typeof bridge.quickSheet === 'object' ? bridge.quickSheet : {};
  const hinge = out.instructionalHinge && typeof out.instructionalHinge === 'object' ? out.instructionalHinge : {};

  return {
    planSummary: normalizeText(out.planSummary),
    detectedConcern: {
      category: normalizeNeedCategory(out?.detectedConcern?.category),
      rationale: normalizeText(out?.detectedConcern?.rationale),
    },
    riskMoments: (Array.isArray(out.riskMoments) ? out.riskMoments : [])
      .map((m) => ({
        momentLabel: normalizeText(m?.momentLabel),
        lessonPhase: normalizeText(m?.lessonPhase),
        whyRisky: normalizeText(m?.whyRisky),
        talkMoveId: normalizeText(m?.talkMoveId),
        talkMoveName: normalizeText(m?.talkMoveName),
        teacherScriptEnglish: normalizeText(m?.teacherScriptEnglish),
        teacherScriptBridge: normalizeText(m?.teacherScriptBridge),
        sentenceFrames: asStringArray(m?.sentenceFrames).slice(0, 3),
      }))
      .filter((m) => m.momentLabel || m.whyRisky)
      .slice(0, 6),
    pacingCoach: {
      teacherTalkZones: (Array.isArray(pacing.teacherTalkZones) ? pacing.teacherTalkZones : [])
        .map((z) => ({
          zone: normalizeText(z?.zone),
          signal: normalizeText(z?.signal),
          hardBreakMoveId: normalizeText(z?.hardBreakMoveId),
          hardBreakMoveName: normalizeText(z?.hardBreakMoveName),
          script: normalizeText(z?.script),
        }))
        .filter((z) => z.zone || z.script)
        .slice(0, 5),
      talkRatioTip: normalizeText(pacing.talkRatioTip),
    },
    languageBridge: {
      cognates: (Array.isArray(bridge.cognates) ? bridge.cognates : [])
        .map((c) => ({
          english: normalizeText(c?.english),
          malay: normalizeText(c?.malay),
          note: normalizeText(c?.note),
        }))
        .filter((c) => c.english && c.malay)
        .slice(0, 10),
      quickSheet: {
        targetQuestionEnglish: normalizeText(quickSheet.targetQuestionEnglish),
        lowStakesEntryBridge: normalizeText(quickSheet.lowStakesEntryBridge),
        sentenceFrames: asStringArray(quickSheet.sentenceFrames).slice(0, 3),
      },
    },
    instructionalHinge: {
      hingeQuestionEnglish: normalizeText(hinge.hingeQuestionEnglish),
      hingeQuestionBridge: normalizeText(hinge.hingeQuestionBridge),
      gamePlan: (Array.isArray(hinge.gamePlan) ? hinge.gamePlan : [])
        .map((g) => ({
          ifStudentSays: normalizeText(g?.ifStudentSays),
          language: normalizeText(g?.language),
          useMoveId: normalizeText(g?.useMoveId),
          useMoveName: normalizeText(g?.useMoveName),
          teacherResponse: normalizeText(g?.teacherResponse),
        }))
        .filter((g) => g.ifStudentSays || g.teacherResponse)
        .slice(0, 6),
    },
    agencyShift: asStringArray(out.agencyShift).slice(0, 5),
  };
}

function sanitizeLiveCoach(data) {
  const out = data && typeof data === 'object' ? data : {};
  const readBack = out.readBack && typeof out.readBack === 'object' ? out.readBack : {};
  const micro = out.microAdaptation && typeof out.microAdaptation === 'object' ? out.microAdaptation : {};
  const step1 = micro.step1TalkMove && typeof micro.step1TalkMove === 'object' ? micro.step1TalkMove : {};
  const step2 = micro.step2SentenceFrames && typeof micro.step2SentenceFrames === 'object' ? micro.step2SentenceFrames : {};
  const step3 = micro.step3PhrasingTip && typeof micro.step3PhrasingTip === 'object' ? micro.step3PhrasingTip : {};

  return {
    readBack: {
      detectedLanguage: normalizeText(readBack.detectedLanguage),
      needCategory: normalizeNeedCategory(readBack.needCategory),
      summaryEnglish: normalizeText(readBack.summaryEnglish),
      summaryBridge: normalizeText(readBack.summaryBridge),
    },
    microAdaptation: {
      step1TalkMove: {
        talkMoveId: normalizeText(step1.talkMoveId),
        talkMoveName: normalizeText(step1.talkMoveName),
        why: normalizeText(step1.why),
        sayNowEnglish: normalizeText(step1.sayNowEnglish),
        sayNowBridge: normalizeText(step1.sayNowBridge),
      },
      step2SentenceFrames: {
        boardTitle: normalizeText(step2.boardTitle),
        frames: asStringArray(step2.frames).slice(0, 3),
      },
      step3PhrasingTip: {
        tipMalay: normalizeText(step3.tipMalay),
        tipIban: normalizeText(step3.tipIban),
        whenToUse: normalizeText(step3.whenToUse),
      },
    },
    regainFocusLine: normalizeText(out.regainFocusLine),
    ifItFails: normalizeText(out.ifItFails),
  };
}

const VALID_PRIMER_GAMES = ['bingo', 'flyswatter', 'hotseat'];

function sanitizePrimer(data) {
  const out = data && typeof data === 'object' ? data : {};
  const transition = out.transition && typeof out.transition === 'object' ? out.transition : {};

  return {
    games: (Array.isArray(out.games) ? out.games : [])
      .map((g) => ({
        gameId: VALID_PRIMER_GAMES.includes(normalizeText(g?.gameId).toLowerCase())
          ? normalizeText(g?.gameId).toLowerCase()
          : '',
        name: normalizeText(g?.name),
        setupEnglish: normalizeText(g?.setupEnglish),
        setupBridge: normalizeText(g?.setupBridge),
        controlBenefit: normalizeText(g?.controlBenefit),
      }))
      .filter((g) => g.gameId && g.setupEnglish)
      .slice(0, 3),
    wordCards: (Array.isArray(out.wordCards) ? out.wordCards : [])
      .map((w) => ({
        word: normalizeText(w?.word),
        kidDefinition: normalizeText(w?.kidDefinition),
        clue: normalizeText(w?.clue),
        bridgeWord: normalizeText(w?.bridgeWord),
        isCognate: Boolean(w?.isCognate),
        cognateNote: normalizeText(w?.cognateNote),
      }))
      .filter((w) => w.word)
      .slice(0, 6),
    gridWords: asStringArray(out.gridWords)
      .map((w) => w.toLowerCase())
      .slice(0, 12),
    localHook: normalizeText(out.localHook),
    transition: {
      talkMoveId: normalizeText(transition.talkMoveId),
      talkMoveName: normalizeText(transition.talkMoveName),
      teacherLineEnglish: normalizeText(transition.teacherLineEnglish),
      teacherLineBridge: normalizeText(transition.teacherLineBridge),
      sentenceFrames: asStringArray(transition.sentenceFrames).slice(0, 3),
    },
  };
}

function buildPrimerSystemInstruction() {
  return [
    'You are a 5-minute "pocket coach" for a Sarawak primary teacher. The teacher gives you ONLY a handful of vocabulary words for today. There is no lesson plan. Speed and simplicity matter.',
    BILINGUAL_INTENT_INSTRUCTIONS,
    TALK_MOVE_PALETTE,
    'Produce a Vocab Game Primer with exactly these parts:',
    '1. games: exactly 3 game options, one per gameId:',
    '   - "bingo": pupils get a 3x3 word grid; teacher calls CLUES (never the word itself); pupils mark the matching word.',
    '   - "flyswatter": words written large on the board; two pupils race to swat the word matching the clue.',
    '   - "hotseat": one pupil sits facing away from the board; the class describes the word in simple English so the pupil can guess it.',
    '   For each game give a setup script the teacher can say verbatim (setupEnglish, max 2 short sentences), the same in Sarawak Malay/Iban (setupBridge), and controlBenefit: one short clause on why this game channels energy and restores classroom control.',
    '2. wordCards: one card per input word with: kidDefinition (simple English, 12 words max, suitable for the year level), clue (one caller line for the games that does NOT contain the word or its root), bridgeWord (Malay translation, or Iban if fully confident), isCognate (true only for genuine English-Malay cognates/loanwords like "informasi/information"), cognateNote (short, why the pair helps, empty if not a cognate).',
    '3. gridWords: 9 to 12 lowercase words for bingo grids: ALL input words plus simple related words pupils at this level already know. No phrases longer than 2 words.',
    '4. localHook: ONE sentence connecting the word set to everyday Sarawak life (market, river, longhouse, kampung, weather, food) the teacher can use as the opener.',
    '5. transition: the MANDATORY game-to-reasoning bridge. After the game, the teacher must convert play into dialogic talk: pick ONE palette talk move (e.g., TM-T07 Repeating or TM-T04 Say More), give teacherLineEnglish (e.g., "Now that we have played with the words, who can put \'habitat\' into their own words?"), teacherLineBridge (Malay/Iban), and up to 3 pupil sentence frames so PUPILS do the talking.',
    'Keep every string short; this is read on a phone while pupils enter the room.',
    'Always output valid JSON only. No markdown. Keys exactly:',
    '{',
    '  "games": [ { "gameId": "bingo" | "flyswatter" | "hotseat", "name": string, "setupEnglish": string, "setupBridge": string, "controlBenefit": string } ],',
    '  "wordCards": [ { "word": string, "kidDefinition": string, "clue": string, "bridgeWord": string, "isCognate": boolean, "cognateNote": string } ],',
    '  "gridWords": string[],',
    '  "localHook": string,',
    '  "transition": { "talkMoveId": string, "talkMoveName": string, "teacherLineEnglish": string, "teacherLineBridge": string, "sentenceFrames": string[] }',
    '}',
  ].join('\n');
}

function buildPrimerUserPrompt(input, words) {
  return [
    `Today's vocabulary words: ${words.join(', ')}`,
    `Year Level: ${normalizeText(input.yearLevel) || 'Year 4'}`,
    `Subject: ${normalizeText(input.subject) || 'General'}`,
    `Dominant Home Language: ${normalizeText(input.dominantLanguage) || 'Iban'}`,
    'Return the Vocab Game Primer JSON now.',
  ].join('\n');
}

function buildLessonCoachSystemInstruction() {
  return [
    'You are an instructional coach who INTERROGATES primary lesson plans for EAL risk. You never merely summarise.',
    BILINGUAL_INTENT_INSTRUCTIONS,
    TALK_MOVE_PALETTE,
    'Your job, in order:',
    '1. Read the lesson plan and find the HIGH-RISK MOMENTS where pupils with weak English will go silent, copy without understanding, or switch off (dense teacher explanation, abstract vocabulary, "discuss" with no scaffold, reading-heavy tasks, question sequences pitched above pupil English level).',
    '2. PACING COACH: flag "Teacher-Talk Overload" zones, stretches where the teacher talks for more than roughly 3-4 minutes without pupil talk. For each zone prescribe a hard break using TM-T01 Wait Time or TM-T02 Turn and Talk with an exact script.',
    '3. LANGUAGE BRIDGE: list English-Malay cognates from this lesson\'s vocabulary (e.g., "informasi/information") as bridges, and build one Quick-Sheet: the target question in English, a low-stakes entry question in Sarawak Malay/Iban, and exactly 3 sentence frames pupils can use to answer in complete (simple) English.',
    '4. INSTRUCTIONAL HINGE: one hinge question with an if/then game plan, e.g., "If the pupil answers X in Malay, use TM-T03 Revoicing to confirm in English. If the pupil answers Y in English, use TM-T04 Say More to push for evidence."',
    '5. AGENCY SHIFT: short tips that cut teacher talk and force pupils to do the linguistic work.',
    'Every teacher script must exist in BOTH simple English and a Malay/Iban bridge version.',
    'Always output valid JSON only. No markdown. No commentary. Keys exactly:',
    '{',
    '  "planSummary": string,',
    '  "detectedConcern": { "category": "pacing" | "control" | "scaffolding" | "mixed", "rationale": string },',
    '  "riskMoments": [',
    '    { "momentLabel": string, "lessonPhase": string, "whyRisky": string, "talkMoveId": string, "talkMoveName": string, "teacherScriptEnglish": string, "teacherScriptBridge": string, "sentenceFrames": string[] }',
    '  ],',
    '  "pacingCoach": {',
    '    "teacherTalkZones": [ { "zone": string, "signal": string, "hardBreakMoveId": string, "hardBreakMoveName": string, "script": string } ],',
    '    "talkRatioTip": string',
    '  },',
    '  "languageBridge": {',
    '    "cognates": [ { "english": string, "malay": string, "note": string } ],',
    '    "quickSheet": { "targetQuestionEnglish": string, "lowStakesEntryBridge": string, "sentenceFrames": string[] }',
    '  },',
    '  "instructionalHinge": {',
    '    "hingeQuestionEnglish": string,',
    '    "hingeQuestionBridge": string,',
    '    "gamePlan": [ { "ifStudentSays": string, "language": string, "useMoveId": string, "useMoveName": string, "teacherResponse": string } ]',
    '  },',
    '  "agencyShift": string[]',
    '}',
    'Quality constraints:',
    '- Provide 3 to 6 riskMoments anchored to concrete lines or phases of the plan (quote or paraphrase the plan so the teacher recognises the spot).',
    '- planSummary is ONE sentence; spend your tokens on risks and moves, not summary.',
    '- Cognates must be real Malay loanwords/cognates; if the lesson offers none, bridge through the closest everyday Malay word and say so in "note".',
    '- sentenceFrames must be short enough to write on a board in 10 seconds.',
    '- gamePlan needs at least one branch for a Malay/Iban answer and one for a simple-English answer.',
  ].join('\n');
}

function buildLessonCoachUserPrompt(input, lessonText) {
  return [
    `Year Level: ${normalizeText(input.yearLevel) || 'Year 4'}`,
    `Subject: ${normalizeText(input.subject) || 'General'}`,
    `Dominant Home Language: ${normalizeText(input.dominantLanguage) || 'Iban'}`,
    `Teacher's stated concern (may be empty, may be in EN/MS/Iban): ${normalizeText(input.focusConcern) || 'None stated; infer from the plan.'}`,
    'LESSON PLAN TEXT:',
    '"""',
    lessonText,
    '"""',
    'Interrogate this plan as instructed and return the JSON game plan.',
  ].join('\n');
}

function buildLiveCoachSystemInstruction() {
  return [
    'You are an in-the-moment classroom coach. A teacher is mid-lesson and has 30 seconds to read your answer. Be immediate, concrete, and calm.',
    BILINGUAL_INTENT_INSTRUCTIONS,
    TALK_MOVE_PALETTE,
    'The teacher gives a quick, rough, possibly informal observation (any of the three languages). You must:',
    '1. Read back the need: detect the input language and classify the need (pacing, control, scaffolding, or mixed). Restate it in one short English sentence and one short Sarawak Malay sentence so the teacher trusts you understood.',
    '2. Return ONE 3-step Micro-Adaptation:',
    '   - Step 1: ONE palette talk move to deploy right now, with the exact line to say in simple English AND in Malay/Iban bridge.',
    '   - Step 2: Up to 3 board-ready sentence frames the PUPILS use to respond (so pupils, not the teacher, do the talking).',
    '   - Step 3: A phrasing tip in Malay (and Iban when confident) telling the teacher how to lower the entry barrier without abandoning English.',
    '3. Add one "regain focus" line the teacher can say verbatim to reset attention, and one backup if the first move falls flat.',
    'Pick moves that hand talk to pupils: prefer TM-T01 Wait Time and TM-T02 Turn and Talk for control/pacing crises; TM-T03 Revoicing, TM-T07 Repeating, and sentence frames for language crises.',
    'Keep every string short. No paragraphs. This is read while standing in front of children.',
    'Always output valid JSON only. No markdown. Keys exactly:',
    '{',
    '  "readBack": { "detectedLanguage": string, "needCategory": "pacing" | "control" | "scaffolding" | "mixed", "summaryEnglish": string, "summaryBridge": string },',
    '  "microAdaptation": {',
    '    "step1TalkMove": { "talkMoveId": string, "talkMoveName": string, "why": string, "sayNowEnglish": string, "sayNowBridge": string },',
    '    "step2SentenceFrames": { "boardTitle": string, "frames": string[] },',
    '    "step3PhrasingTip": { "tipMalay": string, "tipIban": string, "whenToUse": string }',
    '  },',
    '  "regainFocusLine": string,',
    '  "ifItFails": string',
    '}',
    'If you are not confident in Iban wording, leave "tipIban" as an empty string rather than guessing.',
  ].join('\n');
}

function buildLiveCoachUserPrompt(input) {
  return [
    `Live observation from the teacher: ${normalizeText(input.observation)}`,
    `Year Level: ${normalizeText(input.yearLevel) || 'Unknown'}`,
    `Subject: ${normalizeText(input.subject) || 'Unknown'}`,
    `Dominant Home Language: ${normalizeText(input.dominantLanguage) || 'Iban'}`,
    'Return the 3-step Micro-Adaptation JSON now.',
  ].join('\n');
}

async function callGemini({ model, systemInstruction, userPrompt, sanitize }) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: { systemInstruction },
  });
  const text = response.text;
  const parsed = safeParseJson(text);
  if (!parsed) {
    throw new Error('Model did not return valid JSON.');
  }
  return sanitize(parsed);
}

class CoachError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function generateCoachResponse({ cacheKey, systemInstruction, userPrompt, sanitize }) {
  counters = normalizeCounters(counters);

  const cached = planCache[cacheKey];
  if (cached?.plan) {
    return {
      plan: cached.plan,
      meta: {
        fromCache: true,
        modelUsed: cached.modelUsed || 'cache',
        counters,
        mode: counters.proCalls >= PRIMARY_MODEL_SWITCH_THRESHOLD ? 'high-speed' : 'high-quality',
      },
    };
  }

  const canUsePrimary =
    counters.proCalls < PRIMARY_MODEL_SWITCH_THRESHOLD && counters.proCalls < PRIMARY_MODEL_LIMIT;
  const canUseFallback = counters.flashCalls < FALLBACK_MODEL_LIMIT;
  if (!canUsePrimary && !canUseFallback) {
    throw new CoachError(429, 'Daily model limits reached. Please try again tomorrow (UTC).');
  }

  let modelUsed = canUsePrimary ? PRIMARY_MODEL_NAME : FALLBACK_MODEL_NAME;
  let plan;

  try {
    plan = await callGemini({ model: modelUsed, systemInstruction, userPrompt, sanitize });
  } catch (primaryError) {
    const fallbackAllowed = modelUsed === PRIMARY_MODEL_NAME && canUseFallback;
    if (!fallbackAllowed) throw primaryError;
    modelUsed = FALLBACK_MODEL_NAME;
    plan = await callGemini({ model: modelUsed, systemInstruction, userPrompt, sanitize });
  }

  if (modelUsed === PRIMARY_MODEL_NAME) counters.proCalls += 1;
  else counters.flashCalls += 1;
  writeJson(COUNTERS_PATH, counters);

  planCache[cacheKey] = { createdAt: Date.now(), modelUsed, plan };
  planCache = pruneCache(planCache);
  writeJson(CACHE_PATH, planCache);

  return {
    plan,
    meta: {
      fromCache: false,
      modelUsed,
      counters,
      mode: modelUsed === PRIMARY_MODEL_NAME ? 'high-quality' : 'high-speed',
    },
  };
}

async function extractLessonText(input) {
  const pasted = String(input.lessonPlanText || '').trim();
  if (pasted) return pasted;
  const pdfBase64 = String(input.pdfBase64 || '').trim();
  if (!pdfBase64) return '';
  const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
  const buffer = Buffer.from(pdfBase64, 'base64');
  const result = await pdfParse(buffer);
  return String(result.text || '').trim();
}

let counters = normalizeCounters(readJson(COUNTERS_PATH, { date: getUtcDateKey(), proCalls: 0, flashCalls: 0 }));
let planCache = pruneCache(readJson(CACHE_PATH, {}));

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// API endpoint for image checking (from vite.config)
app.get('/api/check-image', (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    res.status(400).json({ error: 'Missing filename' });
    return;
  }
  const filepath = path.join(__dirname, 'dist', String(filename));
  const exists = fs.existsSync(filepath);
  res.json({ exists });
});

// API endpoint for saving images
app.post('/api/save-image', express.json({ limit: '50mb' }), (req, res) => {
  try {
    const { filename, base64 } = req.body;
    if (!filename || !base64) {
      res.status(400).json({ error: 'Missing filename or base64' });
      return;
    }
    const filepath = path.join(__dirname, 'dist', filename);
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/talk-move-plan', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY on server.' });
      return;
    }

    const input = req.body || {};
    const question = normalizeText(input.question);

    if (!question) {
      res.status(400).json({ error: 'Teacher question is required.' });
      return;
    }

    const cacheKey = createCacheKey('plan', {
      question: question.toLowerCase(),
      yearLevel: normalizeText(input.yearLevel).toLowerCase(),
      subject: normalizeText(input.subject).toLowerCase(),
      dominantLanguage: normalizeText(input.dominantLanguage).toLowerCase(),
      classProfile: normalizeText(input.classProfile).toLowerCase(),
      vocabulary: Array.isArray(input.vocabulary)
        ? input.vocabulary.map((v) => normalizeText(v).toLowerCase()).filter(Boolean).sort()
        : [],
    });

    const result = await generateCoachResponse({
      cacheKey,
      systemInstruction: buildSystemInstruction(),
      userPrompt: buildUserPrompt(input),
      sanitize: sanitizePlan,
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

app.post('/api/lesson-coach', express.json({ limit: '15mb' }), async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY on server.' });
      return;
    }

    const input = req.body || {};
    let lessonText;
    try {
      lessonText = await extractLessonText(input);
    } catch {
      res.status(400).json({ error: 'Could not read the PDF. Please paste the lesson text instead.' });
      return;
    }
    if (!lessonText) {
      res.status(400).json({ error: 'Lesson plan text is required (paste it or upload a file).' });
      return;
    }
    const MAX_LESSON_CHARS = 16000;
    if (lessonText.length > MAX_LESSON_CHARS) {
      lessonText = lessonText.slice(0, MAX_LESSON_CHARS);
    }

    const cacheKey = createCacheKey('lesson-coach', {
      lessonText: lessonText.toLowerCase(),
      yearLevel: normalizeText(input.yearLevel).toLowerCase(),
      subject: normalizeText(input.subject).toLowerCase(),
      dominantLanguage: normalizeText(input.dominantLanguage).toLowerCase(),
      focusConcern: normalizeText(input.focusConcern).toLowerCase(),
    });

    const result = await generateCoachResponse({
      cacheKey,
      systemInstruction: buildLessonCoachSystemInstruction(),
      userPrompt: buildLessonCoachUserPrompt(input, lessonText),
      sanitize: sanitizeLessonCoach,
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

app.post('/api/live-coach', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY on server.' });
      return;
    }

    const input = req.body || {};
    const observation = normalizeText(input.observation);
    if (!observation) {
      res.status(400).json({ error: 'A quick observation is required.' });
      return;
    }

    const cacheKey = createCacheKey('live-coach', {
      observation: observation.toLowerCase(),
      yearLevel: normalizeText(input.yearLevel).toLowerCase(),
      subject: normalizeText(input.subject).toLowerCase(),
      dominantLanguage: normalizeText(input.dominantLanguage).toLowerCase(),
    });

    const result = await generateCoachResponse({
      cacheKey,
      systemInstruction: buildLiveCoachSystemInstruction(),
      userPrompt: buildLiveCoachUserPrompt(input),
      sanitize: sanitizeLiveCoach,
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

app.post('/api/primer', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY on server.' });
      return;
    }

    const input = req.body || {};
    const seen = new Set();
    const words = (Array.isArray(input.words) ? input.words : [])
      .map((w) => normalizeText(w).toLowerCase())
      .filter((w) => w && w.length <= 40)
      .filter((w) => (seen.has(w) ? false : (seen.add(w), true)))
      .slice(0, 6);

    if (words.length < 2) {
      res.status(400).json({ error: 'Give me at least 2 vocabulary words.' });
      return;
    }

    const cacheKey = createCacheKey('primer', {
      words: [...words].sort(),
      yearLevel: normalizeText(input.yearLevel).toLowerCase(),
      subject: normalizeText(input.subject).toLowerCase(),
      dominantLanguage: normalizeText(input.dominantLanguage).toLowerCase(),
    });

    const result = await generateCoachResponse({
      cacheKey,
      systemInstruction: buildPrimerSystemInstruction(),
      userPrompt: buildPrimerUserPrompt(input, words),
      sanitize: sanitizePrimer,
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
