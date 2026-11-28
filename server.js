import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Provider-agnostic approved LLM adapter (Azure OpenAI | OpenAI-compatible ZDR | Fireworks) ---
// Deployment switches provider through environment variables only; no code changes.
// LLM_PROVIDER: 'azure-openai' | 'openai-compatible' | 'fireworks'
const RAW_LLM_PROVIDER = String(process.env.LLM_PROVIDER || '').trim().toLowerCase();
const HAS_AZURE_CONFIG = Boolean(process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_API_KEY);
const AUTO_DETECTED_FIREWORKS =
  !RAW_LLM_PROVIDER && Boolean(process.env.FIREWORKS_API_KEY) && !HAS_AZURE_CONFIG;
const LLM_PROVIDER = RAW_LLM_PROVIDER || (AUTO_DETECTED_FIREWORKS ? 'fireworks' : 'azure-openai');

function resolveLlmApiKey(provider) {
  if (provider === 'azure-openai') {
    return process.env.AZURE_OPENAI_API_KEY || process.env.LLM_API_KEY || '';
  }
  if (provider === 'fireworks') {
    return process.env.FIREWORKS_API_KEY || process.env.LLM_API_KEY || '';
  }
  return process.env.LLM_API_KEY || '';
}

const LLM_API_KEY = resolveLlmApiKey(LLM_PROVIDER);
const AZURE_OPENAI_ENDPOINT = String(process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
const LLM_BASE_URL =
  process.env.LLM_BASE_URL ||
  process.env.FIREWORKS_BASE_URL ||
  'https://api.fireworks.ai/inference/v1/chat/completions';

// Fail loudly on startup if an unapproved provider is configured
const ALLOWED_PROVIDERS = new Set(['azure-openai', 'openai-compatible', 'fireworks']);
if (!ALLOWED_PROVIDERS.has(LLM_PROVIDER)) {
  throw new Error(`Unsupported LLM_PROVIDER "${LLM_PROVIDER}".`);
}
// Azure has no default endpoint: without one every request would fail at call time with an
// opaque URL error, so refuse to start and say exactly what to set.
if (LLM_PROVIDER === 'azure-openai' && !AZURE_OPENAI_ENDPOINT) {
  throw new Error(
    'LLM_PROVIDER "azure-openai" requires AZURE_OPENAI_ENDPOINT ' +
      '(https://<resource>.openai.azure.com). To keep the existing Fireworks setup, set LLM_PROVIDER=fireworks instead.',
  );
}

// OpenAI reasoning-model deployments (o-series, GPT-5 family) reject `max_tokens` and the
// penalty parameters. Opt in to that request shape without code changes.
const LLM_REASONING_MODEL_PARAMS =
  String(process.env.LLM_REASONING_MODEL_PARAMS || 'false').toLowerCase() === 'true';

// Configurable models via environment variables:
// - VISION_MODEL: cheap vision model that extracts text/diagrams from screenshots first
// - REASONING_MODEL: high-nuance model (Kimi K3.1 Pro) for instruction following & reasoning prep
// - FALLBACK_MODEL: high-volume fallback when primary daily limit is reached
// On Azure the model name is the deployment name. The FIREWORKS_* names are still honoured so
// existing deployments keep working; the provider-neutral names take precedence when both exist.
const MODEL_NAMES = {
  vision:
    process.env.VISION_MODEL ||
    process.env.FIREWORKS_VISION_MODEL ||
    'accounts/fireworks/models/minimax-m3p1-flash',
  primary:
    process.env.REASONING_MODEL ||
    process.env.FIREWORKS_REASONING_MODEL ||
    'accounts/fireworks/models/kimi-k3p1-pro',
  fallback:
    process.env.FALLBACK_MODEL ||
    process.env.FIREWORKS_FALLBACK_MODEL ||
    'accounts/fireworks/models/minimax-m3p1-flash',
};
const VISION_MODEL_NAME = MODEL_NAMES.vision;
const PRIMARY_MODEL_NAME = MODEL_NAMES.primary;
const FALLBACK_MODEL_NAME = MODEL_NAMES.fallback;

// Surface likely misconfiguration at boot instead of as a confusing 4xx during a lesson.
function warnOnLlmMisconfiguration() {
  if (AUTO_DETECTED_FIREWORKS) {
    console.warn(
      '[llm] LLM_PROVIDER is unset and only FIREWORKS_API_KEY is configured; using "fireworks". Set LLM_PROVIDER explicitly in deployment env vars.',
    );
  }
  if (LLM_PROVIDER === 'azure-openai') {
    if (!process.env.AZURE_OPENAI_API_KEY && process.env.LLM_API_KEY) {
      console.warn(
        '[llm] LLM_PROVIDER=azure-openai but AZURE_OPENAI_API_KEY is unset; using LLM_API_KEY.',
      );
    }
    if (
      !process.env.VISION_MODEL &&
      !process.env.REASONING_MODEL &&
      !process.env.FIREWORKS_VISION_MODEL &&
      !process.env.FIREWORKS_REASONING_MODEL
    ) {
      console.warn(
        '[llm] LLM_PROVIDER=azure-openai but no VISION_MODEL / REASONING_MODEL is set; the default Fireworks model ids will be sent as Azure deployment names.',
      );
    }
  }
  if (LLM_PROVIDER === 'openai-compatible' && !process.env.LLM_BASE_URL) {
    console.warn(
      '[llm] LLM_PROVIDER=openai-compatible without LLM_BASE_URL; requests will go to the Fireworks endpoint.',
    );
  }
}
warnOnLlmMisconfiguration();

// If set to "false", sends image directly to REASONING_MODEL when vision + reasoning are the same
const SPLIT_VISION_PIPELINE =
  String(process.env.FIREWORKS_SPLIT_VISION ?? 'true').toLowerCase() !== 'false';

const PRIMARY_MODEL_LIMIT = Number(process.env.PRIMARY_MODEL_LIMIT || 1000);
const PRIMARY_MODEL_SWITCH_THRESHOLD = Number(process.env.PRIMARY_MODEL_SWITCH_THRESHOLD || 950);
const FALLBACK_MODEL_LIMIT = Number(process.env.FALLBACK_MODEL_LIMIT || 150000);

const DATA_DIR = process.env.COACH_DATA_DIR || path.join(__dirname, '.kilo');
const COUNTERS_PATH = path.join(DATA_DIR, 'model-usage-counters.json');
const CACHE_PATH = path.join(DATA_DIR, 'talk-move-plan-cache-v2.json');
const LEGACY_CACHE_PATH = path.join(DATA_DIR, 'talk-move-plan-cache.json');
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

const VALID_TALK_MOVE_IDS = new Set(
  (Array.isArray(talkMovesData?.quick_reference_table) ? talkMovesData.quick_reference_table : [])
    .map((move) => normalizeText(move?.id))
    .filter(Boolean),
);

function normalizeTalkMoveId(value) {
  const id = normalizeText(value).toUpperCase();
  return VALID_TALK_MOVE_IDS.has(id) ? id : '';
}

// ============================================
// CORE 6 STRATEGY SPINE (S1–S6) — 2027 programme
// Single source of truth: core6_strategies.json (also imported by the frontend).
// ============================================
const CORE6_STRATEGY_IDS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const CORE6_STRATEGIES = (() => {
  const data = readJson(path.join(__dirname, 'core6_strategies.json'), null);
  const list = (Array.isArray(data?.strategies) ? data.strategies : [])
    .filter((strategy) => strategy && typeof strategy === 'object')
    .map((strategy) => ({
      id: normalizeText(strategy.id).toUpperCase(),
      name: normalizeText(strategy.name),
      shortName: normalizeText(strategy.shortName) || normalizeText(strategy.name),
      window: normalizeText(strategy.window),
      mechanism: normalizeText(strategy.mechanism),
      teacherMove: normalizeText(strategy.teacherMove),
      pupilTarget: normalizeText(strategy.pupilTarget),
      coachHints: asStringArray(strategy.coachHints),
    }));
  if (CORE6_STRATEGY_IDS.some((id) => !list.some((strategy) => strategy.id === id))) {
    throw new Error(`core6_strategies.json must define strategies ${CORE6_STRATEGY_IDS.join(', ')}.`);
  }
  return CORE6_STRATEGY_IDS.map((id) => list.find((strategy) => strategy.id === id));
})();

/** Returns 'S1'–'S6' for a valid strategy id, otherwise '' (no spotlight). */
function normalizeActiveStrategy(value) {
  const id = normalizeText(value).toUpperCase();
  return CORE6_STRATEGY_IDS.includes(id) ? id : '';
}

function getCore6Strategy(value) {
  const id = normalizeActiveStrategy(value);
  return id ? CORE6_STRATEGIES.find((strategy) => strategy.id === id) : null;
}

function strategyLabel(strategy) {
  return `${strategy.id} ${strategy.shortName}`;
}

function buildStrategyUserLine(activeStrategy) {
  const strategy = getCore6Strategy(activeStrategy);
  return strategy
    ? `Core 6 Strategy spotlight: ${strategy.id} "${strategy.name}" — ${strategy.window}. Make it the primary spotlight; earlier strategies may still support it.`
    : '';
}

/**
 * Prompt block that makes the active strategy the PRIMARY spotlight of the teacher script,
 * board frames, and follow-up moves, while earlier foundational habits keep supporting it
 * (cumulative spotlight: earlier strategies are never banned when coaching later weeks).
 * Returns null when no valid strategy is active.
 */
function buildStrategySpotlightInstruction(activeStrategy, { where = '' } = {}) {
  const strategy = getCore6Strategy(activeStrategy);
  if (!strategy) return null;
  const index = CORE6_STRATEGIES.indexOf(strategy);
  const earlier = CORE6_STRATEGIES.slice(0, index);
  const later = CORE6_STRATEGIES.slice(index + 1);
  return [
    `CORE 6 STRATEGY SPINE (2027 programme) — ACTIVE STRATEGY SPOTLIGHT: ${strategy.id} "${strategy.name}" (${strategy.window}).`,
    `- Classroom mechanism: ${strategy.mechanism}`,
    `- Primary teacher move: ${strategy.teacherMove}`,
    `- Target pupil discourse / action: ${strategy.pupilTarget}`,
    'HOW TO APPLY THE SPOTLIGHT:',
    `- Make ${strategy.id} the PRIMARY SPOTLIGHT of the generated teacher script, board frames, and follow-up moves${
      where ? ` (especially: ${where})` : ''
    }.`,
    ...strategy.coachHints.map((hint) => `- ${hint}`),
    earlier.length
      ? `- CUMULATIVE SPOTLIGHT RULE: earlier foundational habits still SUPPORT ${
          strategy.id
        } naturally and must never be banned, removed, or avoided: ${earlier.map(strategyLabel).join('; ')}.`
      : `- CUMULATIVE SPOTLIGHT RULE: ${strategy.id} opens the spine; keep the general dialogic supports (sentence frames, translanguaging, wait time after pupil answers) working alongside it.`,
    later.length
      ? `- Later strategies (${later.map((item) => item.id).join(', ')}) are NOT the spotlight here. Do not build the output around them; at most name one as a next step.`
      : `- ${strategy.id} closes the Sprint 1 spine; no later strategy applies.`,
    '- Keep the output schema below exactly as specified: express the spotlight through the CONTENT of the fields, not by adding keys.',
  ].join('\n');
}

/** Joins prompt lines while dropping null entries (a null spotlight block means "inactive"). */
function joinPromptLines(lines) {
  return lines.filter((line) => line !== null && line !== undefined).join('\n');
}


const EEF_INCLUSIVE_TEACHING_BRIEF = [
  'EEF INCLUSIVE TEACHING EVIDENCE BASE — use ONE principle in every Live Coach response:',
  '- scaf_1 Scaffolding increases independence over time: make support temporary, keep expectations high, position independence as success. Best for EAL learners and below-average readers.',
  '- scaf_2 Remove scaffolding gradually: fade one support at a time, move from worked to partial examples, protect confidence.',
  '- scaf_3 Ask pupils to explain their success: help pupils identify strategies/resources that helped so responsibility transfers back to them.',
  '- check_1 Explain why you are checking understanding: uncertainty is useful information; checking is support, not judgement. Best for EAL and below-average readers.',
  '- check_2 Normalise mistakes: treat misconceptions calmly as evidence for next teaching, not failure. Best for below-average readers and SEND.',
  '- check_3 Reduce social pressure, not cognitive challenge: make participation safe while keeping expectations high. Best for EAL learners.',
  '- calm_1 Predictable routines reduce uncertainty: use consistent language, routines, and warnings before changes.',
  '- calm_2 Pupils thrive when valued: use whole-class response routines, early success, and mistake-safe participation.',
  '- calm_3 Explain why routines matter: model/reteach routines and explain how they support learning.',
  '- adapt_1 Support thinking rather than reduce it: use prompts, cues, sentence starters, and thinking time before helping; keep the learning intention the same.',
  '- adapt_2 Enhance high-quality teaching: chunk long tasks, model one more example, and add guided practice with feedback.',
  '- adapt_3 Small adaptations are often best: pre-teach vocabulary/concepts, adjust scaffolding before changing tasks, and use temporary flexible grouping.',
  'Check-Adapt states: Most misunderstand => PAUSE AND FIX; Some are unsure => ADAPT SUPPORT; Most understand => EXTEND AND SUPPORT.',
  'For EAL learners: separate language production from understanding, reduce social pressure, use visuals/thinking time, and pre-teach vocabulary when needed.',
  'For below-average readers: separate reading demand from task demand, adapt input format before task demand, and keep cognitive challenge high.',
].join('\n');

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

function buildSystemInstruction(activeStrategy = '') {
  return joinPromptLines([
    'You are a Dialogic Pedagogical Language Bridge expert for EAL classrooms.',
    BILINGUAL_INTENT_INSTRUCTIONS,
    TALK_MOVE_PALETTE,
    buildStrategySpotlightInstruction(activeStrategy, {
      where:
        'coreQuestion, talkMove1Revoicing, talkMove2PressReasoning, quickBoardReadyLines, followUpMap, and assessmentForLearning',
    }),
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
  ]);
}

function buildUserPrompt(input, activeStrategy = '') {
  const safeVocabulary = Array.isArray(input.vocabulary)
    ? input.vocabulary.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  return joinPromptLines([
    `Teacher Question: ${normalizeText(input.question)}`,
    `Year Level: ${normalizeText(input.yearLevel) || 'Year 2'}`,
    `Subject: ${normalizeText(input.subject) || 'General'}`,
    `Dominant Home Language: ${normalizeText(input.dominantLanguage) || 'Iban'}`,
    `Context (special things to consider): ${normalizeText(input.classProfile) || 'Lower-performing pupils; language and concept support needed.'}`,
    `Priority Vocabulary: ${safeVocabulary.join(', ') || 'Use topic-specific assessment vocabulary.'}`,
    buildStrategyUserLine(activeStrategy),
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
  ]);
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

const LIVE_BARRIERS = [
  'reading-access',
  'vocabulary',
  'decoding',
  'comprehension',
  'motivation',
  'participation',
  'pacing',
  'control',
  'mixed',
];

function normalizeLiveBarrier(value) {
  const v = normalizeText(value).toLowerCase();
  return LIVE_BARRIERS.includes(v) ? v : 'mixed';
}

const LIVE_IDEA_KINDS = ['alternative-move', 'root-cause', 'missed-angle', 'risk', 'beyond-palette'];

function normalizeCoachingPhase(value) {
  const v = normalizeText(value).toLowerCase();
  return v === 'advise' ? 'advise' : 'explore';
}

function normalizeActionMode(value) {
  const v = normalizeText(value).toLowerCase().replace(/_/g, '-');
  if (v === 'prep-card' || v === 'prep_card' || v === 'prep') return 'prep_card';
  return v === 'firm_up' || v === 'firm-up' ? 'firm_up' : v === 'reset' ? 'reset' : 'diagnose';
}

function normalizeDiagnosticTag(value) {
  const v = normalizeText(value).toLowerCase().replace(/-/g, '_');
  if (v === 'correct_reasoning' || v === 'correct') return 'correct_reasoning';
  if (v === 'concept_misconception' || v === 'misconception') return 'concept_misconception';
  return 'language_or_surface_trap';
}

function sanitizePrepCardBlock(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const ctx =
    raw.detectedVisualContext && typeof raw.detectedVisualContext === 'object'
      ? raw.detectedVisualContext
      : {};
  const s1 =
    raw.strand1_dialogicReasoning && typeof raw.strand1_dialogicReasoning === 'object'
      ? raw.strand1_dialogicReasoning
      : {};
  const claims =
    s1.competingClaims && typeof s1.competingClaims === 'object' ? s1.competingClaims : {};
  const s2 =
    raw.strand2_vocabularyAndEalLadder && typeof raw.strand2_vocabularyAndEalLadder === 'object'
      ? raw.strand2_vocabularyAndEalLadder
      : {};
  const ladder =
    s2.ealProgressionLadder && typeof s2.ealProgressionLadder === 'object'
      ? s2.ealProgressionLadder
      : {};
  const s3 =
    raw.strand3_aflAndTransfer && typeof raw.strand3_aflAndTransfer === 'object'
      ? raw.strand3_aflAndTransfer
      : {};
  const twist =
    s3.whatIfTransferTwist && typeof s3.whatIfTransferTwist === 'object'
      ? s3.whatIfTransferTwist
      : {};

  const options = (Array.isArray(s3.options) ? s3.options : [])
    .map((opt, idx) => ({
      finger: Number(opt?.finger) || idx + 1,
      text: normalizeText(opt?.text),
      diagnosticTag: normalizeDiagnosticTag(opt?.diagnosticTag),
    }))
    .filter((opt) => opt.text)
    .slice(0, 3);

  const followUpChips = (Array.isArray(raw.followUpChips) ? raw.followUpChips : [])
    .map((chip, idx) => ({
      id: normalizeText(chip?.id) || `chip_${idx + 1}`,
      label: normalizeText(chip?.label),
      nextActionMode: normalizeActionMode(chip?.nextActionMode),
    }))
    .filter((chip) => chip.label)
    .slice(0, 4);

  return {
    detectedVisualContext: {
      pageSummary: normalizeText(ctx.pageSummary),
      visualAnchors: asStringArray(ctx.visualAnchors).slice(0, 4),
      coreConcept: normalizeText(ctx.coreConcept),
      commonMisconception: normalizeText(ctx.commonMisconception),
    },
    strand1_dialogicReasoning: {
      talkMoveId: normalizeText(s1.talkMoveId) || 'TM-T08 + TM-T02',
      talkMoveName:
        normalizeText(s1.talkMoveName) || 'Competing Claims (Agree/Disagree) + Turn and Talk',
      visualHookInstruction: normalizeText(s1.visualHookInstruction),
      competingClaims: {
        claimA: normalizeText(claims.claimA),
        claimB: normalizeText(claims.claimB),
      },
      teacherScriptEn: normalizeText(s1.teacherScriptEn),
      teacherScriptBridge: normalizeText(s1.teacherScriptBridge),
      waitTimeCue:
        normalizeText(s1.waitTimeCue) ||
        'Give 5 seconds of silent thinking time + chest finger-vote before partner talk (TM-T01).',
    },
    strand2_vocabularyAndEalLadder: {
      contentNouns: (Array.isArray(s2.contentNouns) ? s2.contentNouns : [])
        .map((n) => ({
          en: normalizeText(n?.en),
          l1Bridge: normalizeText(n?.l1Bridge),
          visualPointCue: normalizeText(n?.visualPointCue),
        }))
        .filter((n) => n.en)
        .slice(0, 4),
      relationalConnectors: (Array.isArray(s2.relationalConnectors) ? s2.relationalConnectors : [])
        .map((r) => ({
          en: normalizeText(r?.en),
          l1Bridge: normalizeText(r?.l1Bridge),
          gestureCue: normalizeText(r?.gestureCue),
        }))
        .filter((r) => r.en)
        .slice(0, 4),
      ealProgressionLadder: {
        rung1_pointAndWord: normalizeText(ladder.rung1_pointAndWord),
        rung2_twoChoiceCloze: normalizeText(ladder.rung2_twoChoiceCloze),
        rung3_causalFrameEn: normalizeText(ladder.rung3_causalFrameEn),
        rung3_causalFrameL1: normalizeText(ladder.rung3_causalFrameL1),
      },
    },
    strand3_aflAndTransfer: {
      fingerVotePrompt: normalizeText(s3.fingerVotePrompt),
      options,
      whatIfTransferTwist: {
        promptEn: normalizeText(twist.promptEn),
        promptBridge: normalizeText(twist.promptBridge),
        expectedReasoning: normalizeText(twist.expectedReasoning),
      },
    },
    followUpChips: followUpChips.length
      ? followUpChips
      : [
          {
            id: 'fix_misconception',
            label: 'Most picked the misconception (60s visual reset)',
            nextActionMode: 'reset',
          },
          {
            id: 'revoice_l1_to_en',
            label: 'They know it in Iban, stuck on English (Choral Revoice)',
            nextActionMode: 'firm_up',
          },
          {
            id: 'push_transfer',
            label: "They got it! Push the 'What-If' transfer challenge",
            nextActionMode: 'firm_up',
          },
        ],
  };
}

function normalizeLiveIdeaKind(value) {
  const v = normalizeText(value).toLowerCase().replace(/[^a-z-]/g, '');
  return LIVE_IDEA_KINDS.includes(v) ? v : 'missed-angle';
}

function sanitizeIdea(idea) {
  if (!idea || typeof idea !== 'object') return null;
  const kind = normalizeLiveIdeaKind(idea.kind);
  const headline = normalizeText(idea.headline);
  const detail = normalizeText(idea.detail);
  const rawTalkMoveId = normalizeText(idea.talkMoveId).toUpperCase();
  const offPalette = Boolean(rawTalkMoveId) && !VALID_TALK_MOVE_IDS.has(rawTalkMoveId);
  const sayNowEnglish = normalizeText(idea.sayNowEnglish);
  const sayNowBridge = normalizeText(idea.sayNowBridge);
  if (!headline) return null;
  return {
    kind,
    headline,
    detail,
    talkMoveId: rawTalkMoveId,
    offPalette,
    sayNowEnglish,
    sayNowBridge,
  };
}

function sanitizeLiveCoach(data) {
  const out = data && typeof data === 'object' ? data : {};
  const readBack = out.readBack && typeof out.readBack === 'object' ? out.readBack : {};
  const diagnosis = out.diagnosis && typeof out.diagnosis === 'object' ? out.diagnosis : {};

  const hasPrepCardFields =
    Boolean(out.prepCard && typeof out.prepCard === 'object') ||
    Boolean(out.strand1_dialogicReasoning && typeof out.strand1_dialogicReasoning === 'object') ||
    Boolean(out.detectedVisualContext && typeof out.detectedVisualContext === 'object');

  const rawActionMode = out.actionMode || out.action_mode;
  const actionMode =
    hasPrepCardFields && !rawActionMode ? 'prep_card' : normalizeActionMode(rawActionMode);

  const prepCardRaw =
    out.prepCard && typeof out.prepCard === 'object' ? out.prepCard : hasPrepCardFields ? out : null;
  const prepCard = actionMode === 'prep_card' ? sanitizePrepCardBlock(prepCardRaw || out) : null;

  const defaultSummaryEn = prepCard?.detectedVisualContext?.pageSummary
    ? `Prepared 3-strand reasoning card: ${prepCard.detectedVisualContext.pageSummary}`
    : '';

  const result = {
    actionMode,
    readBack: {
      detectedLanguage: normalizeText(readBack.detectedLanguage) || (prepCard ? 'image' : ''),
      needCategory: normalizeNeedCategory(
        readBack.needCategory || (prepCard ? 'scaffolding' : 'mixed'),
      ),
      summaryEnglish: normalizeText(readBack.summaryEnglish) || defaultSummaryEn,
      summaryBridge: normalizeText(readBack.summaryBridge),
    },
    diagnosis: {
      barrier: normalizeLiveBarrier(
        diagnosis.barrier || (prepCard ? 'comprehension' : 'mixed'),
      ),
      confidence: Math.max(
        0,
        Math.min(1, Number(diagnosis.confidence ?? (prepCard ? 0.9 : 0))),
      ),
      evidence:
        normalizeText(diagnosis.evidence) ||
        normalizeText(prepCard?.detectedVisualContext?.commonMisconception),
    },
    teacherMirror:
      normalizeText(out.teacherMirror) ||
      normalizeText(prepCard?.detectedVisualContext?.commonMisconception) ||
      defaultSummaryEn,
    rationaleNote:
      normalizeText(out.rationaleNote) ||
      normalizeText(prepCard?.detectedVisualContext?.coreConcept),
    ideas: (Array.isArray(out.ideas) ? out.ideas : [])
      .map(sanitizeIdea)
      .filter(Boolean)
      .slice(0, 4),
  };

  if (normalizeText(out.observeNext)) {
    result.observeNext = normalizeText(out.observeNext);
  }

  // Mode-specific blocks — keep only the one matching actionMode
  const diagnose = out.diagnose && typeof out.diagnose === 'object' ? out.diagnose : {};
  const reset = out.reset && typeof out.reset === 'object' ? out.reset : {};
  const firmUp = (out.firmUp || out.firm_up) && typeof (out.firmUp || out.firm_up) === 'object'
    ? (out.firmUp || out.firm_up)
    : {};

  if (actionMode === 'prep_card' && prepCard) {
    result.prepCard = prepCard;
  } else if (actionMode === 'diagnose') {
    result.diagnose = {
      hypothesis: normalizeText(diagnose.hypothesis),
      clarifyingQuestion: normalizeText(
        diagnose.clarifyingQuestion || diagnose.clarifying_question,
      ),
      clarifyingOptions: asStringArray(
        diagnose.clarifyingOptions || diagnose.clarifying_options,
      ).slice(0, 4),
    };
  } else if (actionMode === 'reset') {
    const eefPrinciple =
      (reset.eefPrinciple || reset.eef_principle) &&
      typeof (reset.eefPrinciple || reset.eef_principle) === 'object'
        ? reset.eefPrinciple || reset.eef_principle
        : {};
    result.reset = {
      eefPrinciple: {
        principleId: normalizeText(eefPrinciple.principleId),
        principle: normalizeText(eefPrinciple.principle),
        whyThisFits: normalizeText(eefPrinciple.whyThisFits),
        checkAdaptAction: normalizeText(eefPrinciple.checkAdaptAction),
      },
      resetActionSteps: asStringArray(
        reset.resetActionSteps || reset.reset_action_steps,
      ).slice(0, 5),
    };
  } else if (actionMode === 'firm_up') {
    const talkMove =
      (firmUp.talkMove || firmUp.talk_move) &&
      typeof (firmUp.talkMove || firmUp.talk_move) === 'object'
        ? firmUp.talkMove || firmUp.talk_move
        : {};
    const talkMoveRawId = normalizeText(talkMove.talkMoveId).toUpperCase();
    const rawFrames = Array.isArray(firmUp.bilingualSentenceFrames || firmUp.bilingual_sentence_frames)
      ? firmUp.bilingualSentenceFrames || firmUp.bilingual_sentence_frames
      : [];
    const bilingualFrames = rawFrames
      .map((f) => {
        if (f && typeof f === 'object') {
          return {
            en: normalizeText(f.en),
            bridge: normalizeText(f.bridge),
          };
        }
        return null;
      })
      .filter(Boolean);
    result.firmUp = {
      eefRationale: normalizeText(firmUp.eefRationale || firmUp.eef_rationale),
      talkMove: {
        talkMoveId: talkMoveRawId,
        offPalette: Boolean(talkMoveRawId) && !VALID_TALK_MOVE_IDS.has(talkMoveRawId),
        talkMoveName: normalizeText(talkMove.talkMoveName),
        why: normalizeText(talkMove.why),
        sayNowEnglish: normalizeText(talkMove.sayNowEnglish),
        sayNowBridge: normalizeText(talkMove.sayNowBridge),
      },
      bilingualSentenceFrames: bilingualFrames,
    };
    const phrasingTip =
      (firmUp.phrasingTip || firmUp.phrasing_tip) &&
      typeof (firmUp.phrasingTip || firmUp.phrasing_tip) === 'object'
        ? firmUp.phrasingTip || firmUp.phrasing_tip
        : {};
    if (
      normalizeText(phrasingTip.tipMalay) ||
      normalizeText(phrasingTip.tipIban) ||
      normalizeText(phrasingTip.whenToUse)
    ) {
      result.firmUp.phrasingTip = {
        tipMalay: normalizeText(phrasingTip.tipMalay),
        tipIban: normalizeText(phrasingTip.tipIban),
        whenToUse: normalizeText(phrasingTip.whenToUse),
      };
    }
  }

  if (normalizeText(out.regainFocusLine)) {
    result.regainFocusLine = normalizeText(out.regainFocusLine);
  }
  if (normalizeText(out.ifItFails)) {
    result.ifItFails = normalizeText(out.ifItFails);
  }

  return result;
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

function buildPrimerSystemInstruction(activeStrategy = '') {
  return joinPromptLines([
    'You are a 5-minute "pocket coach" for a Sarawak primary teacher. The teacher gives you ONLY a handful of vocabulary words for today. There is no lesson plan. Speed and simplicity matter.',
    BILINGUAL_INTENT_INSTRUCTIONS,
    TALK_MOVE_PALETTE,
    buildStrategySpotlightInstruction(activeStrategy, {
      where: 'games setup scripts, wordCards, and the game-to-reasoning transition (teacherLine + sentence frames)',
    }),
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
  ]);
}

function buildPrimerUserPrompt(input, words, activeStrategy = '') {
  return joinPromptLines([
    `Today's vocabulary words: ${words.join(', ')}`,
    `Year Level: ${normalizeText(input.yearLevel) || 'Year 4'}`,
    `Subject: ${normalizeText(input.subject) || 'General'}`,
    `Dominant Home Language: ${normalizeText(input.dominantLanguage) || 'Iban'}`,
    buildStrategyUserLine(activeStrategy),
    'Return the Vocab Game Primer JSON now.',
  ]);
}

function buildLessonCoachSystemInstruction(activeStrategy = '') {
  return joinPromptLines([
    'You are an instructional coach who INTERROGATES primary lesson plans for EAL risk. You never merely summarise.',
    BILINGUAL_INTENT_INSTRUCTIONS,
    TALK_MOVE_PALETTE,
    buildStrategySpotlightInstruction(activeStrategy, {
      where:
        'riskMoments teacher scripts and sentence frames, pacingCoach hard breaks, languageBridge.quickSheet sentence frames, and the instructionalHinge game plan',
    }),
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
  ]);
}

function buildLessonCoachUserPrompt(input, lessonText, activeStrategy = '') {
  return joinPromptLines([
    `Year Level: ${normalizeText(input.yearLevel) || 'Year 4'}`,
    `Subject: ${normalizeText(input.subject) || 'General'}`,
    `Dominant Home Language: ${normalizeText(input.dominantLanguage) || 'Iban'}`,
    `Teacher's stated concern (may be empty, may be in EN/MS/Iban): ${normalizeText(input.focusConcern) || 'None stated; infer from the plan.'}`,
    buildStrategyUserLine(activeStrategy),
    'LESSON PLAN TEXT:',
    '"""',
    lessonText,
    '"""',
    'Interrogate this plan as instructed and return the JSON game plan.',
  ]);
}

const LIVE_COACH_STRATEGY_LEAD = {
  S1: 'LEAD WITH S1 (Open Question + Wait Time): set strand1_dialogicReasoning.talkMoveId to "TM-T01", write teacherScriptEn/Bridge around ONE open reasoning or prediction question anchored to the visual, and put an explicit 5–7 second silent wait-time cue (no hands yet) in waitTimeCue.',
  S2: 'LEAD WITH S2 (Safe Rehearsal): set strand1_dialogicReasoning.talkMoveId to "TM-T02", script a 1–2 minute Think-Pair-Share welcoming Iban/Sarawak Malay in teacherScriptEn/Bridge, and explicitly normalise unfinished ideas in waitTimeCue.',
  S3: 'LEAD WITH S3 (Deliberate Vocabulary & EAL Ladder): script teacherScriptEn/Bridge around choral rehearsal ("I say, you say") of the two key nouns + one relational connector before pointing pupils to the 3-rung EAL board ladder.',
  S4: 'LEAD WITH S4 (Uptake: Revoice & Evidence Probe): set strand1_dialogicReasoning.talkMoveId to "TM-T03 + TM-T04", script an explicit revoice ("So you are saying...") followed by a picture/test evidence probe ("What in the picture makes you say that?") in teacherScriptEn/Bridge and firm_up.',
  S5: 'LEAD WITH S5 (Whole-Class Check & Adapt): lead teacherScriptEn/Bridge with the 30-second whole-class chest finger-vote check before moving on, separating language-stuck vs concept-error so the teacher can pivot immediately.',
  S6: 'LEAD WITH S6 (Competing Claims & What-If Transfer): set strand1_dialogicReasoning.talkMoveId to "TM-T08 + TM-T02", centre teacherScriptEn/Bridge on comparing Ali and Bisi’s claims with evidence, and highlight the What-If transfer twist.',
};

function buildLiveCoachSystemInstruction(activeStrategy = '') {
  const normalizedStrategy = normalizeActiveStrategy(activeStrategy);
  return joinPromptLines([
    'You are the Sarawak Primary STEM Reasoning & Talk Moves Coach. You help primary teachers (Year 1 to Year 10, especially Mathematics and Science DLP) in Sarawak prepare high-impact, zero-prep classroom routines from a screenshot of a textbook page, worksheet, or classroom resource, AND you coach them through live classroom friction in a multi-turn conversation.',
    'Most pupils speak Iban or Sarawak Malay as their first language (L1) and have emerging English proficiency (EAL Band A/B). Teachers are strong in content but under severe time pressure.',
    '',
    'EAL LENS (your strongest interpretive default): When students disengage, go silent, freeze, or copy, interpret that FIRST as cognitive overload or a language barrier — not as defiance, laziness, or poor behaviour.',
    '',
    'YOUR KNOWLEDGE SOURCES (a reference library):',
    BILINGUAL_INTENT_INSTRUCTIONS,
    EEF_INCLUSIVE_TEACHING_BRIEF,
    TALK_MOVE_PALETTE,
    buildStrategySpotlightInstruction(activeStrategy, {
      where:
        'prepCard teacher scripts (teacherScriptEn/Bridge), waitTimeCue, board frames (ealProgressionLadder), followUpChips, and reset/firm_up steps and sentence frames',
    }),
    normalizedStrategy ? `LIVE COACH LEAD MOVE OVERRIDE: ${LIVE_COACH_STRATEGY_LEAD[normalizedStrategy]}` : null,
    '',
    'ACTION MODE — choose exactly ONE each turn ("prep_card" | "diagnose" | "reset" | "firm_up"):',
    '- "prep_card": choose "prep_card" for a new image/screenshot (or new EXTRACTED TEXTBOOK/WORKSHEET VISUAL STIMULUS), or when actionTrigger is build_reasoning_prep, competing_claims_debate, spot_mistake, or simplify_bridge. Return the complete 3-Strand Reasoning Prep Card inside "prepCard".',
    '- "diagnose": use in follow-up or text-only turns when the teacher reports a freeze, disengagement, copying, or the situation is ambiguous between a cognitive barrier (content too hard) vs linguistic barrier (cannot produce English). Return hypothesis, ONE clarifying_question, and 2-4 tappable clarifying_options.',
    '- "reset": REQUIRED when actionTrigger is fix_misconception; also use when the teacher clicks a visual reset chip or when the conceptual jump is too large and students need a concrete model/worked example first. Do NOT regenerate the prep card on this follow-up turn. Return an EEF principle and 2-5 reset_action_steps.',
    '- "firm_up": REQUIRED when actionTrigger is revoice_l1_to_en or push_transfer; also use when the barrier is clear or the teacher clicks a revoice/transfer chip and students need to verbalize their thinking. Do NOT regenerate the prep card on this follow-up turn. Return eef_rationale, talk_move, and bilingual_sentence_frames.',
    '- HANDED-OFF CHIPS: when Action Trigger is exactly "reset" or "firm_up" it was sent from the Concept Cartoon Studio. Treat it exactly like a clicked chip of that mode (do NOT regenerate the prep card); the teacher message carries the classroom context for the move.',
    '',
    'CRITICAL PEDAGOGICAL RULES FOR "prep_card" MODE:',
    'CLARITY FIRST: write for a busy teacher reading at arm\'s length. Prefer about 140 English words across the useful card content, but never add filler just to meet a limit. Use simple CEFR B1/B2 teacher English and concrete primary-school words. Keep spoken lines near 10 words and other sentences under 15 words where natural. Start teacher instructions with an action verb. Give exact actions, words to say, and board lines — no pedagogical essays or meta-commentary.',
    'Describe the page only through one short coreConcept (the main learning goal) and one short commonMisconception (what to watch for). The teacher can already see the screenshot: do not inventory the page or describe left/right positions in pageSummary or visualAnchors. Make visualHookInstruction one short pointing action, ideally 6 words or fewer.',
    '1. NEVER generate rote recall or closed memory questions from the screenshot. Build student reasoning, relational vocabulary, and error-detection (AfL) so students can transfer thinking to unseen problems.',
    '2. ANCHOR PROMPTS TO THE VISUAL: name only the object or diagram pupils must point to. Do not describe the whole page again.',
    '3. USE COMPETING CLAIMS (CONCEPT CARTOON STYLE) FOR STRAND 1: Frame the dialogic prompt around two fictional pupils (Ali and Bisi) making competing claims or predictions about the visual in the screenshot — one stating the correct reasoning and one stating a realistic misconception (vary which pupil is right so students cannot guess by name) — and ask pupils: "Who do you agree with, and what in the picture proves it?" Keep claimA and claimB as short spoken pupil lines, not explanations.',
    '4. TEACH RELATIONAL VOCABULARY + A 3-RUNG EAL LADDER IN STRAND 2: Always pair 2 content nouns with 2 useful relational words (for example, "more than", "less than", "because"). The three ladder fields must contain ONLY short lines pupils can read from the board. Do not include band names, level labels, teacher explanation, or instructions inside these fields:',
    '   - rung1_pointAndWord: one English word or very short echo line linked to the visual.',
    '   - rung2_twoChoiceCloze: one short frame with two choices, such as "A has more / less water than B."',
    '   - rung3_causalFrameEn: one short "___ because ___" reasoning frame.',
    '   - rung3_causalFrameL1: a matching short Iban or Sarawak Malay support line.',
    '5. BUILD ERROR-SPOTTING & A "WHAT-IF" TRANSFER TWIST IN STRAND 3:',
    '   - Create a 30-second whole-class Finger-Vote check (1, 2, or 3 fingers held against the chest) where 1 option is "correct_reasoning", 1 option is "concept_misconception", and 1 option is "language_or_surface_trap" (vary which finger number is correct).',
    '   - Add one "Beyond-the-Page What-If Twist": change one variable or condition in the screenshot diagram and ask what would happen next, training students for far-transfer reasoning.',
    '6. IBAN & SARAWAK MALAY BRIDGING: When Dominant Home Language is Iban, use natural classroom Iban phrases for conceptual hooks (e.g., "Peratika gambar tu...", "Sapa ti betul — Ali tauka Bisi? Nama kebuah?", "Tunjuk ba gambar...", "Sebut sama enggau pangan..."). If a technical STEM term has no everyday Iban word, use the everyday Iban descriptive phrase + Bahasa Melayu cognate -> bridge directly to the English DLP target term.',
    '',
    'Always output valid JSON only. No markdown. Omit unused mode blocks so only the block matching action_mode is present:',
    '{',
    '  "action_mode": "prep_card" | "diagnose" | "reset" | "firm_up",',
    '  "readBack": { "detectedLanguage": string, "needCategory": "pacing" | "control" | "scaffolding" | "mixed", "summaryEnglish": string, "summaryBridge": string },',
    '  "diagnosis": { "barrier": "reading-access" | "vocabulary" | "decoding" | "comprehension" | "motivation" | "participation" | "pacing" | "control" | "mixed", "confidence": number, "evidence": string },',
    '  "teacherMirror": string,',
    '  "rationaleNote": string,',
    '  "observeNext"?: string,',
    '  "ideas"?: [ { "kind": "alternative-move" | "root-cause" | "missed-angle" | "risk" | "beyond-palette", "headline": string, "detail": string, "talkMoveId"?: string, "offPalette"?: boolean, "sayNowEnglish"?: string, "sayNowBridge"?: string } ],',
    '  "prepCard"?: {',
    '    "detectedVisualContext": {',
    '      "pageSummary": "One short main-idea sentence; do not inventory the page",',
    '      "visualAnchors": [],',
    '      "coreConcept": "One short lesson goal in simple English",',
    '      "commonMisconception": "One short pupil error to watch for"',
    '    },',
    '    "strand1_dialogicReasoning": {',
    '      "talkMoveId": "TM-T08 + TM-T02",',
    '      "talkMoveName": "Competing Claims (Agree/Disagree) + Turn and Talk",',
    '      "visualHookInstruction": "One short action, e.g. Point to the two beakers.",',
    '      "competingClaims": {',
    '        "claimA": "Ali says: \'...\'",',
    '        "claimB": "Bisi says: \'...\'"',
    '      },',
    '      "teacherScriptEn": "One short English line to read aloud",',
    '      "teacherScriptBridge": "The same short line in Iban or Sarawak Malay",',
    '      "waitTimeCue": "One short action: Wait 5 seconds. Vote. Talk to your partner."',
    '    },',
    '    "strand2_vocabularyAndEalLadder": {',
    '      "contentNouns": [ { "en": "English noun", "l1Bridge": "Iban / Sarawak Malay term", "visualPointCue": "One short pointing action" } ],',
    '      "relationalConnectors": [ { "en": "more than / because / increases", "l1Bridge": "Iban / Sarawak Malay equivalent", "gestureCue": "One short gesture action" } ],',
    '      "ealProgressionLadder": {',
    '        "rung1_pointAndWord": "One short board-ready word or echo line, with no level label",',
    '        "rung2_twoChoiceCloze": "One short two-choice board line, with no level label",',
    '        "rung3_causalFrameEn": "One short because-frame for the board, with no level label",',
    '        "rung3_causalFrameL1": "One short matching Iban / Sarawak Malay support line"',
    '      }',
    '    },',
    '    "strand3_aflAndTransfer": {',
    '      "fingerVotePrompt": "30-second whole-class check question anchored to the image",',
    '      "options": [',
    '        { "finger": 1, "text": "Option 1", "diagnosticTag": "correct_reasoning" | "concept_misconception" | "language_or_surface_trap" },',
    '        { "finger": 2, "text": "Option 2", "diagnosticTag": "correct_reasoning" | "concept_misconception" | "language_or_surface_trap" },',
    '        { "finger": 3, "text": "Option 3", "diagnosticTag": "correct_reasoning" | "concept_misconception" | "language_or_surface_trap" }',
    '      ],',
    '      "whatIfTransferTwist": {',
    '        "promptEn": "One \'What if we changed X in this picture?\' question that cannot be answered by rote reading",',
    '        "promptBridge": "Iban / Sarawak Malay bridge for the What-If twist",',
    '        "expectedReasoning": "What pupils should notice when that variable changes"',
    '      }',
    '    },',
    '    "followUpChips": [',
    '      { "id": "fix_misconception", "label": "Most picked the misconception (60s visual reset)", "nextActionMode": "reset" },',
    '      { "id": "revoice_l1_to_en", "label": "They know it in Iban, stuck on English (Choral Revoice)", "nextActionMode": "firm_up" },',
    '      { "id": "push_transfer", "label": "They got it! Push the \'What-If\' transfer challenge", "nextActionMode": "firm_up" }',
    '    ]',
    '  },',
    '  "diagnose"?: { "hypothesis": string, "clarifying_question": string, "clarifying_options": string[] },',
    '  "reset"?: { "eef_principle": { "principleId": string, "principle": string, "whyThisFits": string, "checkAdaptAction": "PAUSE AND FIX" | "ADAPT SUPPORT" | "EXTEND AND SUPPORT" }, "reset_action_steps": string[] },',
    '  "firm_up"?: { "eef_rationale": string, "talk_move": { "talkMoveId": string, "offPalette"?: boolean, "talkMoveName": string, "why": string, "sayNowEnglish": string, "sayNowBridge": string }, "bilingual_sentence_frames": [ { "en": string, "bridge": string } ], "phrasing_tip"?: { "tipMalay": string, "tipIban": string, "whenToUse": string } },',
    '  "regainFocusLine"?: string,',
    '  "ifItFails"?: string',
    '}',
  ]);
}

function buildLiveCoachUserPrompt(input) {
  const lines = [
    `Live observation / request from the teacher: ${normalizeText(input.observation || input.userText) || 'Build a 3-strand reasoning prep card for this resource.'}`,
    `Year Level: ${normalizeText(input.yearLevel) || 'Year 4'}`,
    `Subject: ${normalizeText(input.subject) || 'Science'}`,
    `Dominant Home Language: ${normalizeText(input.dominantLanguage || input.homeLanguage) || 'Iban'}`,
  ];
  if (input.actionTrigger) {
    lines.push(`Action Trigger: ${normalizeText(input.actionTrigger)}`);
  }
  const strategyLine = buildStrategyUserLine(input.activeStrategy);
  if (strategyLine) {
    lines.push(strategyLine);
  }
  if (input.visionSummary) {
    lines.push(
      'EXTRACTED TEXTBOOK/WORKSHEET VISUAL STIMULUS (from Vision Model):',
      input.visionSummary,
      'Use this visual stimulus to return action_mode = "prep_card" with the complete prepCard JSON block.',
    );
  }
  lines.push('Return the Live Coach JSON now.');
  return lines.join('\n');
}

const COACH_ROLE_TO_CHAT = { teacher: 'user', coach: 'assistant' };

function buildLiveCoachMessages(thread, contextLines, visionSummary) {
  const history = [];
  const fullContext = [...(contextLines || [])];
  if (visionSummary) {
    fullContext.push(
      '',
      'EXTRACTED TEXTBOOK/WORKSHEET VISUAL STIMULUS (from Vision Model):',
      visionSummary,
    );
  }
  if (fullContext.length) {
    history.push({ role: 'user', content: fullContext.join('\n') });
    history.push({
      role: 'assistant',
      content: 'Understood. I have the class and visual context. Ready for the teacher input.',
    });
  }
  for (const msg of thread) {
    const role = COACH_ROLE_TO_CHAT[msg.role] || 'user';
    history.push({ role, content: String(msg.text || '') });
  }
  return history;
}

async function callLlmChat({ model, messages, maxTokens = 8192 }) {
  const isAzure = LLM_PROVIDER === 'azure-openai';
  const url = isAzure
    ? `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=${encodeURIComponent(AZURE_OPENAI_API_VERSION)}`
    : LLM_BASE_URL;

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(isAzure ? { 'api-key': LLM_API_KEY } : { Authorization: `Bearer ${LLM_API_KEY}` }),
  };

  const body = {
    ...(isAzure ? {} : { model }),
    ...(LLM_REASONING_MODEL_PARAMS
      ? { max_completion_tokens: maxTokens }
      : { max_tokens: maxTokens, presence_penalty: 0, frequency_penalty: 0 }),
    messages,
    // top_k is Fireworks-specific; Azure OpenAI and other OpenAI-compatible APIs reject it.
    ...(LLM_PROVIDER === 'fireworks' ? { top_k: 40 } : {}),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errMsg =
      payload?.error?.message ||
      payload?.error ||
      `${LLM_PROVIDER} API error (${response.status})`;
    throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
  }

  const rawContent = payload?.choices?.[0]?.message?.content;
  if (Array.isArray(rawContent)) {
    return rawContent.map((part) => part?.text || '').join('\n');
  }
  return String(rawContent || '');
}

async function extractVisualStimulusWithVisionModel({ image, yearLevel, subject }) {
  const mimeType = normalizeText(image?.mimeType) || 'image/jpeg';
  const rawBase64 = String(image?.base64Data || '').trim();
  const dataUrl = rawBase64.startsWith('data:')
    ? rawBase64
    : `data:${mimeType};base64,${rawBase64}`;

  const visionPrompt = [
    `You are analyzing a classroom textbook page, worksheet, or apparatus photo for Primary ${yearLevel || 'Year 4'} ${subject || 'STEM'}.`,
    'Extract a structured, detailed description for a pedagogical reasoning coach:',
    '1. Exact diagrams, illustrations, characters, labels, tables, numbers, or equations visible on the page (and their spatial position, e.g. top-left, middle table, Picture A vs Picture B).',
    '2. Any printed questions, headings, or key vocabulary terms on the page.',
    '3. The core mathematical or scientific relationship illustrated.',
    '4. The most likely visual or conceptual trap/misconception a primary pupil would have when looking at this page.',
    'Be concise, concrete, and accurate.',
  ].join('\n');

  const text = await callLlmChat({
    model: VISION_MODEL_NAME,
    maxTokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: visionPrompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  counters = normalizeCounters(counters);
  counters.flashCalls += 1;
  writeJson(COUNTERS_PATH, counters);

  return normalizeText(text);
}

async function callLlmStructured({
  model,
  systemInstruction,
  userPrompt,
  messages,
  image,
  sanitize,
}) {
  const chatMessages = [];
  if (systemInstruction) {
    chatMessages.push({ role: 'system', content: systemInstruction });
  }
  if (Array.isArray(messages) && messages.length > 0) {
    chatMessages.push(...messages);
  } else if (userPrompt) {
    chatMessages.push({ role: 'user', content: userPrompt });
  }

  // If SPLIT_VISION_PIPELINE is disabled and an image was passed directly to the model:
  if (image?.base64Data && chatMessages.length > 0) {
    const lastIdx = chatMessages.length - 1;
    const lastMsg = chatMessages[lastIdx];
    const mimeType = normalizeText(image.mimeType) || 'image/jpeg';
    const rawBase64 = String(image.base64Data).trim();
    const dataUrl = rawBase64.startsWith('data:')
      ? rawBase64
      : `data:${mimeType};base64,${rawBase64}`;
    chatMessages[lastIdx] = {
      role: lastMsg.role || 'user',
      content: [
        { type: 'text', text: String(lastMsg.content || '') },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    };
  }

  const text = await callLlmChat({ model, messages: chatMessages });
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

async function generateCoachResponse({
  cacheKey,
  // Zero server-side retention: open-text / screenshot routes pass skipCache so teacher-supplied
  // content is never read from or written to the disk cache (even if a cacheKey is supplied).
  skipCache = false,
  // 'S1'–'S6' Core 6 spotlight already validated by the route; echoed back in meta.strategy.
  activeStrategy = '',
  systemInstruction,
  userPrompt,
  messages,
  image,
  visionModelUsed,
  sanitize,
}) {
  counters = normalizeCounters(counters);
  const strategyMeta = getCore6Strategy(activeStrategy);

  const cached = skipCache || !cacheKey ? null : planCache[cacheKey];
  if (cached?.plan) {
    return {
      plan: cached.plan,
      meta: {
        fromCache: true,
        modelUsed: cached.modelUsed || 'cache',
        visionModelUsed: cached.visionModelUsed || visionModelUsed || null,
        counters,
        mode: counters.proCalls >= PRIMARY_MODEL_SWITCH_THRESHOLD ? 'high-speed' : 'high-quality',
        strategy: strategyMeta,
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
    plan = await callLlmStructured({
      model: modelUsed,
      systemInstruction,
      userPrompt,
      messages,
      image,
      sanitize,
    });
  } catch (primaryError) {
    const fallbackAllowed = modelUsed === PRIMARY_MODEL_NAME && canUseFallback;
    if (!fallbackAllowed) throw primaryError;
    modelUsed = FALLBACK_MODEL_NAME;
    plan = await callLlmStructured({
      model: modelUsed,
      systemInstruction,
      userPrompt,
      messages,
      image,
      sanitize,
    });
  }

  if (modelUsed === PRIMARY_MODEL_NAME) counters.proCalls += 1;
  else counters.flashCalls += 1;
  writeJson(COUNTERS_PATH, counters);

  const combinedModelLabel = visionModelUsed ? `${visionModelUsed} -> ${modelUsed}` : modelUsed;
  if (cacheKey && !skipCache) {
    planCache[cacheKey] = {
      createdAt: Date.now(),
      modelUsed: combinedModelLabel,
      visionModelUsed: visionModelUsed || null,
      plan,
    };
    planCache = pruneCache(planCache);
    writeJson(CACHE_PATH, planCache);
  }

  return {
    plan,
    meta: {
      fromCache: false,
      modelUsed: combinedModelLabel,
      visionModelUsed: visionModelUsed || null,
      counters,
      mode: modelUsed === PRIMARY_MODEL_NAME ? 'high-quality' : 'high-speed',
      strategy: strategyMeta,
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

// ============================================
// CONCEPT CARTOON STUDIO — POST /api/concept-cartoon (stateless, zero retention)
// ============================================
const CARTOON_CAST = ['Ali', 'Bisi', 'Cempaka'];
const CARTOON_CLAIM_TYPES = ['sound', 'misconception', 'language_trap'];
const CARTOON_MAX_BUBBLE_WORDS = 18; // CEFR A2 / Year 4 register limit for each English bubble
const CARTOON_MAX_TOPIC_CHARS = 300;
const CARTOON_PRIVACY_NOTICE = 'Keep inputs generic — do not enter pupil or school names.';
const CARTOON_AI_NOTICE =
  'AI-Generated — Verify scientific accuracy and Iban phrasing before class use.';

const CARTOON_DEFAULT_STEMS = [
  'I agree with ___ because the evidence shows ___.',
  'I disagree with ___ because ___.',
  'In Science, we call this ___.',
  'If we change ___, then ___.',
];

const CARTOON_DEFAULT_CHIPS = [
  {
    id: 'chip_misconception',
    label: 'Most picked the misconception (60s visual reset)',
    targetStrategy: 'S5',
    nextActionMode: 'reset',
    promptContext:
      'Most pupils chose the misconception. Give a 30-second S5 whole-class check, then a 60-second concrete visual reset of the concept.',
  },
  {
    id: 'chip_l1_bridge',
    label: 'They know it in Iban/Malay, stuck on English',
    targetStrategy: 'S3',
    nextActionMode: 'firm_up',
    promptContext:
      'Pupils understand the concept in Iban/Sarawak Malay but cannot form the English sentence. Give a 30-second S3 choral vocabulary + S4 revoice drill.',
  },
  {
    id: 'chip_what_if',
    label: 'They got it — push the What-If challenge',
    targetStrategy: 'S6',
    nextActionMode: 'firm_up',
    promptContext:
      'Pupils chose the sound claim quickly. Push the S6 What-If transfer twist with a 1-minute S2 Turn and Talk.',
  },
];

/** Gold-standard few-shot example. It models FORMAT and REGISTER only (never topic content). */
const CARTOON_GOLD_EXAMPLE = {
  topic: 'Year 4 Science: Evaporation & States of Matter (Drying Clothes)',
  activeStrategy: 'S6',
  claims: [
    {
      id: 'claim_1',
      character: 'Bisi',
      type: 'sound',
      english: 'Heat from the sun turns liquid water into invisible gas that moves into the air.',
      bridge: {
        iban: 'Panas matahari ngubah ai nyadi wap ti enda dipeda lalu tama ngagai angin.',
        sarawakMalay: 'Panas matahari tukar aik jadi wap yang sik nampak, lalu masuk ke udara.',
        ibanNeedsTeacherCheck: false,
      },
      teacherNote:
        'Sound reasoning: Identifies state change (liquid to gas) driven by heat even though water vapour is invisible.',
    },
    {
      id: 'claim_2',
      character: 'Ali',
      type: 'misconception',
      english:
        'The water disappears completely into nothing when the wet shirt dries in the sun.',
      bridge: {
        iban: 'Ai nya lenyau terus nyadi nadai utai lebuh baju nya rangkai kena panas.',
        sarawakMalay: 'Aik ya hilang terus jadi sikda apa-apa bila baju ya kering kena panas.',
        ibanNeedsTeacherCheck: false,
      },
      teacherNote:
        'Conservation misconception: Pupils assume that because liquid water is no longer visible, it has ceased to exist.',
    },
    {
      id: 'claim_3',
      character: 'Cempaka',
      type: 'language_trap',
      english: 'The wet shirt is melting in the hot sun, so all the water drips away.',
      bridge: {
        iban: 'Baju basah nya cair kena panas matahari, nya alai semua ai nitik kebaruh.',
        sarawakMalay: 'Baju basah ya cair kena panas matahari, sebab ya semua aik menitik ke bawah.',
        ibanNeedsTeacherCheck: false,
      },
      teacherNote:
        "Language trap: Confuses 'melting' (solid to liquid, often loosely translated as 'cair' in Malay/Iban) with 'evaporation' (liquid to gas).",
    },
  ],
  sentenceStems: [
    'I agree with ___ because the evidence shows ___.',
    'I disagree with ___ because water does not ___.',
    'In Science, when liquid turns into gas, we call it ___.',
    'The difference between melting and evaporating is ___.',
  ],
  whatIfQuestion: {
    english:
      'What if we hang the exact same wet shirt inside a closed cupboard on a cool, rainy day? Will it dry faster or slower, and why?',
    bridge:
      'Kati enti baju basah nya digantung dalam almari ti ditutup lebuh hari chelap sereta ujan? Jampat agi tauka lubah agi rangkai, lalu nama kebuah?',
  },
  followUpChips: [
    {
      id: 'chip_misconception',
      label: 'Most picked the misconception (60s visual reset)',
      targetStrategy: 'S5',
      nextActionMode: 'reset',
      promptContext:
        'Majority chose the conservation misconception. Give a 30-second S5/S4 wet-handprint board demo showing water moving into the air.',
    },
    {
      id: 'chip_l1_bridge',
      label: 'They know it in Iban/Malay, stuck on English',
      targetStrategy: 'S3',
      nextActionMode: 'firm_up',
      promptContext:
        'Pupils understand the concept in Iban/Sarawak Malay but cannot form the English sentence. Give a 30-second S3 choral vocabulary + S4 revoice drill.',
    },
    {
      id: 'chip_what_if',
      label: 'They got it — push the What-If challenge',
      targetStrategy: 'S6',
      nextActionMode: 'firm_up',
      promptContext:
        'Pupils chose the sound claim quickly. Push the S6 What-If transfer twist comparing wind vs heat with a 1-minute S2 Turn & Talk.',
    },
  ],
};

function buildConceptCartoonSystemInstruction(activeStrategy = '') {
  return joinPromptLines([
    'You are the Concept Cartoon Studio for a Sarawak primary EAL STEM programme (Sprint 1 Week 8-9 and the Sprint 2 pair-driven classroom inquiry).',
    'You turn ONE teacher topic into a printable concept cartoon: three fictional pupils make competing claims and the class must argue about them with evidence.',
    BILINGUAL_INTENT_INSTRUCTIONS,
    buildStrategySpotlightInstruction(activeStrategy, {
      where: 'claims, sentenceStems, whatIfQuestion, and followUpChips',
    }),
    '',
    'CAST - FIXED, EXACTLY THREE CHARACTERS: Ali, Bisi, and Cempaka. Never add, rename, or drop a character and never use any other pupil or teacher name.',
    '',
    'CLAIMS - exactly three, one of EACH type:',
    '- "sound": scientifically correct reasoning stated simply (the claim that best fits the evidence).',
    '- "misconception": a realistic Year 4 misconception about the concept - a wrong science idea, stated confidently and plausibly.',
    '- "language_trap": the science idea is close to right BUT the wrong Science word is used or two near-words are confused (for example "melting" for evaporating, "sucking" for absorbing, "heavy" for dense). It is tempting because it sounds like everyday talk.',
    '',
    'ROLE RANDOMISATION: Decide fresh, for this request only, which character holds which type, and shuffle the order of the three claims. Never give the "sound" claim to the same character by habit. The claim types are a secret teacher key - never print them in the bubbles.',
    '',
    'REGISTER - CEFR A2 / Year 4 EAL (STRICT):',
    `- Each "english" bubble is at most ${CARTOON_MAX_BUBBLE_WORDS} words. Count them before answering.`,
    '- Short active clauses. Everyday, concrete primary-school words. One idea per bubble.',
    '- First-person pupil voice written as plain speech: NO quotation marks, NO attribution prefix (never "Ali says:"), and NO character name inside the bubble text.',
    '- The three bubbles must be similar in length and tone so the sound claim cannot be spotted by style.',
    '',
    'L1 CONCEPTUAL BRIDGE - for every claim give "sarawakMalay" and "iban" versions that explain the same idea cleanly and naturally, the way a pupil would say it in class.',
    'IBAN SAFETY RULE: Never fabricate uncertain technical Iban. If a technical STEM term has no everyday Iban word, use an everyday Iban descriptive phrase and put the Malay/English cognate next to it, then set "ibanNeedsTeacherCheck": true so the teacher verifies the phrasing before writing it on the board. Set it to false ONLY when every Iban word is everyday, natural classroom Iban.',
    '',
    'teacherNote: 1-2 short sentences for the teacher only - why the claim is sound, which misconception it shows, or which two words the language trap confuses.',
    'sentenceStems: exactly 4 board-ready A2 stems for comparative reasoning (agree with evidence, disagree with evidence, name the Science term, contrast the confused words). Use ___ blanks. At most 12 words per stem.',
    'whatIfQuestion: ONE "What if we changed ___?" counter-example that moves the idea into a new situation (far transfer). "english" is at most 30 words; "bridge" is the same question in natural Iban.',
    'followUpChips: exactly 3 next-move chips for the teacher: one "reset" chip for when most pupils pick the misconception (targetStrategy "S5"); one "firm_up" chip for when pupils know the idea in Iban/Malay but are stuck on English (targetStrategy "S3"); one "firm_up" chip for when pupils got it and are ready for the What-If challenge (targetStrategy "S6"). Each chip has a short teacher-facing "label" and a one-sentence "promptContext" telling the Live Coach exactly which 30-60 second move to give.',
    '',
    'SCIENTIFIC ACCURACY: the "sound" claim must be correct primary-school science for the topic. If the topic is ambiguous, use the standard Year 4 textbook interpretation.',
    'PRIVACY: Never invent or repeat real pupil, teacher, or school names. Use only Ali, Bisi, and Cempaka.',
    '',
    'Always output valid JSON only. No markdown. No commentary. Keys exactly:',
    '{',
    '  "claims": [',
    '    {',
    '      "character": "Ali" | "Bisi" | "Cempaka",',
    '      "type": "sound" | "misconception" | "language_trap",',
    '      "english": string,',
    '      "bridge": { "iban": string, "sarawakMalay": string, "ibanNeedsTeacherCheck": boolean },',
    '      "teacherNote": string',
    '    }',
    '  ],',
    '  "sentenceStems": string[],',
    '  "whatIfQuestion": { "english": string, "bridge": string },',
    '  "followUpChips": [',
    '    { "id": string, "label": string, "targetStrategy": "S1" | "S2" | "S3" | "S4" | "S5" | "S6", "nextActionMode": "reset" | "firm_up" | "diagnose", "promptContext": string }',
    '  ]',
    '}',
    'Do not output topic, activeStrategy, privacyNotice, aiNotice, or claim ids - the server adds them.',
    '',
    'GOLD-STANDARD EXAMPLE (format and register only - never reuse its topic, claims, or wording unless the teacher asked for that same topic):',
    JSON.stringify(CARTOON_GOLD_EXAMPLE, null, 2),
  ]);
}

function buildConceptCartoonUserPrompt(
  { topic, teacherFocus, yearLevel, subject, dominantLanguage },
  activeStrategy = '',
) {
  return joinPromptLines([
    `Teacher's topic: ${topic}`,
    teacherFocus ? `Teacher's focus (optional; may be EN/MS/Iban): ${teacherFocus}` : null,
    `Year Level: ${normalizeText(yearLevel) || 'Year 4'}`,
    `Subject: ${normalizeText(subject) || 'Science'}`,
    `Dominant Home Language: ${normalizeText(dominantLanguage) || 'Iban'}`,
    buildStrategyUserLine(activeStrategy),
    'Build the concept cartoon for this topic now and return the JSON only.',
  ]);
}

function shuffleWith(items, randomInt) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeCartoonClaimType(value) {
  const v = normalizeText(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (['sound', 'correct', 'correct_reasoning', 'sound_reasoning', 'target'].includes(v)) return 'sound';
  if (['misconception', 'concept_misconception', 'concept_error'].includes(v)) return 'misconception';
  if (['language_trap', 'trap', 'language', 'surface_trap', 'language_or_surface_trap'].includes(v)) {
    return 'language_trap';
  }
  return '';
}

/**
 * Removes wrapping quotes and any "Ali says:" / "Bisi berkata:" attribution prefix. The server
 * assigns the characters itself, so a name baked into the text would break the randomisation.
 */
function stripCartoonAttribution(text) {
  return normalizeText(text)
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, '')
    .replace(/^(?:ali|bisi|cempaka)\b[^:：]{0,40}[:：]\s*/i, '')
    .trim();
}

function cartoonTextMentionsCast(text) {
  return CARTOON_CAST.some((name) => new RegExp(`\\b${name}\\b`, 'i').test(text));
}

function countCartoonWords(text) {
  return normalizeText(text)
    .split(' ')
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/**
 * Iban safety rule. The model's own flag wins; otherwise flag when the Iban bridge is missing or
 * still contains an untranslated English technical term (6+ letters taken verbatim from the claim).
 */
function resolveIbanNeedsCheck(modelFlag, ibanText, englishText) {
  if (modelFlag === true) return true;
  if (!ibanText) return true;
  const iban = ibanText.toLowerCase();
  const englishTerms = englishText.toLowerCase().match(/[a-z][a-z-]{5,}/g) || [];
  return englishTerms.some((term) => new RegExp(`\\b${term}\\b`).test(iban));
}

function sanitizeCartoonChip(chip, index) {
  const label = normalizeText(chip?.label);
  if (!label) return null;
  const mode = normalizeActionMode(chip?.nextActionMode ?? chip?.next_action_mode);
  const nextActionMode = mode === 'prep_card' ? 'diagnose' : mode;
  return {
    id: normalizeText(chip?.id) || `chip_${index + 1}`,
    label: label.slice(0, 120),
    targetStrategy:
      normalizeActiveStrategy(chip?.targetStrategy) ||
      (nextActionMode === 'reset' ? 'S5' : nextActionMode === 'firm_up' ? 'S6' : ''),
    nextActionMode,
    // Live Coach pre-fills its draft from this; never hand off an empty prompt.
    promptContext:
      normalizeText(chip?.promptContext ?? chip?.prompt_context).slice(0, 400) || label.slice(0, 120),
  };
}

/**
 * Enforces the studio guardrails server-side, whatever the model returned:
 * exactly three claims (one sound / misconception / language_trap) on the fixed cast, with the
 * character-to-role mapping re-randomised on every generation; A2 bubble limit; Iban safety flag.
 * Throws CoachError(502) only for structurally unusable output (a missing claim type), which sends
 * the request to the fallback model. Softer issues are returned as `warnings` for the teacher.
 */
function sanitizeConceptCartoon(data, { topic = '', activeStrategy = '', randomInt } = {}) {
  const out = data && typeof data === 'object' ? data : {};
  const random = typeof randomInt === 'function' ? randomInt : (n) => crypto.randomInt(n);
  const warnings = new Set();

  const byType = new Map();
  for (const claim of Array.isArray(out.claims) ? out.claims : []) {
    const type = normalizeCartoonClaimType(claim?.type);
    const english = stripCartoonAttribution(claim?.english);
    if (!type || byType.has(type) || !english) continue;
    byType.set(type, claim);
  }
  const missingTypes = CARTOON_CLAIM_TYPES.filter((type) => !byType.has(type));
  if (missingTypes.length) {
    throw new CoachError(
      502,
      'The model did not return a complete three-claim cartoon. Please try again.',
    );
  }

  // Role randomisation: a fresh random character per claim type, then a random display order.
  const castOrder = shuffleWith(CARTOON_CAST, random);
  const characterByType = Object.fromEntries(
    castOrder.map((character, index) => [CARTOON_CLAIM_TYPES[index], character]),
  );

  const claims = shuffleWith(CARTOON_CLAIM_TYPES, random).map((type, index) => {
    const claim = byType.get(type);
    const rawBridge = claim.bridge && typeof claim.bridge === 'object' ? claim.bridge : {};
    const english = stripCartoonAttribution(claim.english);
    const iban = stripCartoonAttribution(rawBridge.iban ?? claim.iban);
    const sarawakMalay = stripCartoonAttribution(
      rawBridge.sarawakMalay ?? rawBridge.sarawak_malay ?? rawBridge.malay ?? claim.sarawakMalay,
    );
    const character = characterByType[type];
    const wordCount = countCartoonWords(english);
    if (wordCount > CARTOON_MAX_BUBBLE_WORDS) {
      warnings.add(
        `${character}'s bubble is ${wordCount} words (the Year 4 limit is ${CARTOON_MAX_BUBBLE_WORDS}). Shorten it before display.`,
      );
    }
    if (cartoonTextMentionsCast(english)) {
      warnings.add(`A character name is written inside ${character}'s bubble. Edit it before display.`);
    }
    if (!iban) {
      warnings.add(`The Iban bridge for ${character}'s bubble is missing - add it before board use.`);
    } else if (cartoonTextMentionsCast(iban)) {
      warnings.add(`A character name is written inside ${character}'s Iban bridge. Edit it before display.`);
    }
    return {
      id: `claim_${index + 1}`,
      character,
      type,
      english,
      bridge: {
        iban,
        sarawakMalay,
        ibanNeedsTeacherCheck: resolveIbanNeedsCheck(rawBridge.ibanNeedsTeacherCheck, iban, english),
      },
      teacherNote: normalizeText(claim.teacherNote ?? claim.teacher_note).slice(0, 400),
    };
  });

  const sentenceStems = asStringArray(out.sentenceStems)
    .map((stem) => stem.slice(0, 160))
    .slice(0, 6);
  for (const stem of CARTOON_DEFAULT_STEMS) {
    if (sentenceStems.length >= CARTOON_DEFAULT_STEMS.length) break;
    if (!sentenceStems.includes(stem)) sentenceStems.push(stem);
  }

  const rawWhatIf = out.whatIfQuestion && typeof out.whatIfQuestion === 'object' ? out.whatIfQuestion : {};
  const whatIfQuestion = {
    english: stripCartoonAttribution(
      rawWhatIf.english ?? rawWhatIf.promptEn ?? rawWhatIf.englishQuestion,
    ).slice(0, 400),
    bridge: stripCartoonAttribution(rawWhatIf.bridge ?? rawWhatIf.promptBridge ?? rawWhatIf.iban).slice(
      0,
      600,
    ),
  };

  const followUpChips = (Array.isArray(out.followUpChips) ? out.followUpChips : [])
    .map(sanitizeCartoonChip)
    .filter(Boolean)
    .slice(0, CARTOON_DEFAULT_CHIPS.length);
  const isKnownChip = (chip) =>
    followUpChips.some((existing) => existing.id === chip.id || existing.label === chip.label);
  // Pad with the canonical chips, preferring an action mode the model did not cover yet.
  const coveredModes = new Set(followUpChips.map((chip) => chip.nextActionMode));
  for (const chip of CARTOON_DEFAULT_CHIPS) {
    if (followUpChips.length >= CARTOON_DEFAULT_CHIPS.length) break;
    if (isKnownChip(chip) || coveredModes.has(chip.nextActionMode)) continue;
    followUpChips.push({ ...chip });
    coveredModes.add(chip.nextActionMode);
  }
  for (const chip of CARTOON_DEFAULT_CHIPS) {
    if (followUpChips.length >= CARTOON_DEFAULT_CHIPS.length) break;
    if (!isKnownChip(chip)) followUpChips.push({ ...chip });
  }

  return {
    topic,
    activeStrategy: normalizeActiveStrategy(activeStrategy),
    privacyNotice: CARTOON_PRIVACY_NOTICE,
    aiNotice: CARTOON_AI_NOTICE,
    claims,
    sentenceStems,
    whatIfQuestion,
    followUpChips,
    warnings: [...warnings],
  };
}

try {
  if (fs.existsSync(LEGACY_CACHE_PATH)) fs.unlinkSync(LEGACY_CACHE_PATH);
} catch {}
let counters = normalizeCounters(readJson(COUNTERS_PATH, { date: getUtcDateKey(), proCalls: 0, flashCalls: 0 }));
let planCache = pruneCache(readJson(CACHE_PATH, {}));

// Serve static files from dist
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Baseline HTTP security headers (zero dependencies)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'dist')));

// Lightweight in-memory per-IP sliding-window rate limit for unauthenticated AI endpoints
const API_RATE_LIMIT_MAX = Math.max(1, Number(process.env.API_RATE_LIMIT_MAX || 40));
const API_RATE_LIMIT_WINDOW_MS = Math.max(1000, Number(process.env.API_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000));
const apiRateHits = new Map();

function apiRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const cutoff = now - API_RATE_LIMIT_WINDOW_MS;
  const recent = (apiRateHits.get(key) || []).filter((ts) => ts > cutoff);
  if (recent.length >= API_RATE_LIMIT_MAX) {
    res.setHeader('Retry-After', String(Math.ceil(API_RATE_LIMIT_WINDOW_MS / 1000)));
    res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
    return;
  }
  recent.push(now);
  apiRateHits.set(key, recent);
  // Keep map bounded if many distinct IPs hit the server
  if (apiRateHits.size > 2000) {
    for (const [ip, hits] of apiRateHits.entries()) {
      const active = hits.filter((ts) => ts > cutoff);
      if (active.length === 0) apiRateHits.delete(ip);
      else apiRateHits.set(ip, active);
    }
  }
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: LLM_PROVIDER });
});

const MISSING_LLM_KEY_MESSAGE =
  'Missing LLM API key on server (set AZURE_OPENAI_API_KEY, LLM_API_KEY, or FIREWORKS_API_KEY).';

function hasLlmKey(res) {
  if (LLM_API_KEY) return true;
  res.status(500).json({ error: MISSING_LLM_KEY_MESSAGE });
  return false;
}

app.post('/api/talk-move-plan', apiRateLimit, express.json({ limit: '1mb' }), async (req, res) => {
  try {
    if (!hasLlmKey(res)) return;

    const input = req.body || {};
    const question = normalizeText(input.question);

    if (!question) {
      res.status(400).json({ error: 'Teacher question is required.' });
      return;
    }

    const activeStrategy = normalizeActiveStrategy(input.activeStrategy);

    // Optional disk cache is allowed here (generic question + class context). The strategy is part
    // of the key so an S1 plan is never served for an S6 request.
    const cacheKey = createCacheKey('plan:v3', {
      question: question.toLowerCase(),
      yearLevel: normalizeText(input.yearLevel).toLowerCase(),
      subject: normalizeText(input.subject).toLowerCase(),
      dominantLanguage: normalizeText(input.dominantLanguage).toLowerCase(),
      classProfile: normalizeText(input.classProfile).toLowerCase(),
      vocabulary: Array.isArray(input.vocabulary)
        ? input.vocabulary.map((v) => normalizeText(v).toLowerCase()).filter(Boolean).sort()
        : [],
      activeStrategy,
    });

    const result = await generateCoachResponse({
      cacheKey,
      activeStrategy,
      systemInstruction: buildSystemInstruction(activeStrategy),
      userPrompt: buildUserPrompt(input, activeStrategy),
      sanitize: sanitizePlan,
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

app.post('/api/lesson-coach', apiRateLimit, express.json({ limit: '15mb' }), async (req, res) => {
  try {
    if (!hasLlmKey(res)) return;

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
    const activeStrategy = normalizeActiveStrategy(input.activeStrategy);

    const result = await generateCoachResponse({
      // Zero server-side retention: the lesson plan is teacher-supplied open text.
      skipCache: true,
      activeStrategy,
      systemInstruction: buildLessonCoachSystemInstruction(activeStrategy),
      userPrompt: buildLessonCoachUserPrompt(input, lessonText, activeStrategy),
      sanitize: sanitizeLessonCoach,
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

app.post('/api/live-coach', apiRateLimit, express.json({ limit: '5mb' }), async (req, res) => {
  try {
    if (!hasLlmKey(res)) return;

    const input = req.body || {};
    const observation = normalizeText(input.observation || input.userText);
    const actionTrigger = normalizeText(input.actionTrigger);
    const yearLevel = normalizeText(input.yearLevel);
    const subject = normalizeText(input.subject);
    const dominantLanguage = normalizeText(input.dominantLanguage || input.homeLanguage);
    const activeStrategy = normalizeActiveStrategy(input.activeStrategy);

    const imageObj = input.image && typeof input.image === 'object' ? input.image : null;
    const hasImage = Boolean(imageObj && String(imageObj.base64Data || '').trim());

    const contextLines = [
      `Class context — Year Level: ${yearLevel || 'Year 4'}`,
      `Subject: ${subject || 'Science'}`,
      `Dominant Home Language: ${dominantLanguage || 'Iban'}`,
    ];
    if (actionTrigger) {
      contextLines.push(`Requested Action Trigger: ${actionTrigger}`);
    }
    const strategyLine = buildStrategyUserLine(activeStrategy);
    if (strategyLine) {
      contextLines.push(strategyLine);
    }

    const rawThread = Array.isArray(input.thread || input.messages)
      ? input.thread || input.messages
      : [];

    let visionSummary = normalizeText(input.visionSummary);
    let visionModelUsed = null;
    let directImage = null;

    if (hasImage) {
      if (SPLIT_VISION_PIPELINE) {
        visionSummary = await extractVisualStimulusWithVisionModel({
          image: imageObj,
          yearLevel,
          subject,
        });
        visionModelUsed = VISION_MODEL_NAME;
      } else {
        directImage = imageObj;
      }
    }

    let messages;

    if (rawThread.length > 0) {
      const cleanThread = rawThread
        .map((msg) => ({
          role: msg?.role === 'coach' ? 'coach' : 'teacher',
          text: normalizeText(msg?.text),
        }))
        .filter((msg) => msg.text)
        .slice(-20);

      if (!cleanThread.length && !hasImage && !actionTrigger) {
        res.status(400).json({ error: 'A screenshot or quick observation is required.' });
        return;
      }
      if (cleanThread.length === 0) {
        cleanThread.push({
          role: 'teacher',
          text:
            observation ||
            `[${actionTrigger || 'build_reasoning_prep'}] Generate the 3-strand reasoning prep card for this screenshot.`,
        });
      } else if (cleanThread[cleanThread.length - 1].role !== 'teacher') {
        res.status(400).json({ error: 'The last message must be from the teacher.' });
        return;
      }

      messages = buildLiveCoachMessages(cleanThread, contextLines, visionSummary);
    } else {
      if (!observation && !hasImage && !actionTrigger) {
        res.status(400).json({ error: 'A screenshot or quick observation is required.' });
        return;
      }
      const singlePrompt = buildLiveCoachUserPrompt({
        observation:
          observation ||
          `[${actionTrigger || 'build_reasoning_prep'}] Generate the 3-strand reasoning prep card for this screenshot.`,
        actionTrigger,
        visionSummary,
        yearLevel,
        subject,
        dominantLanguage,
        activeStrategy,
      });
      messages = [{ role: 'user', content: singlePrompt }];
    }

    const result = await generateCoachResponse({
      // Zero server-side retention: observations and screenshots are teacher-supplied.
      skipCache: true,
      activeStrategy,
      systemInstruction: buildLiveCoachSystemInstruction(activeStrategy),
      messages,
      image: directImage,
      visionModelUsed,
      sanitize: sanitizeLiveCoach,
    });
    res.json({
      ...result,
      visionSummary: visionSummary || undefined,
    });
  } catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

app.post('/api/primer', apiRateLimit, express.json({ limit: '1mb' }), async (req, res) => {
  try {
    if (!hasLlmKey(res)) return;

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
    const activeStrategy = normalizeActiveStrategy(input.activeStrategy);

    // Optional disk cache is allowed here (generic word list). The strategy is part of the key.
    const cacheKey = createCacheKey('primer:v3', {
      words: [...words].sort(),
      yearLevel: normalizeText(input.yearLevel).toLowerCase(),
      subject: normalizeText(input.subject).toLowerCase(),
      dominantLanguage: normalizeText(input.dominantLanguage).toLowerCase(),
      activeStrategy,
    });

    const result = await generateCoachResponse({
      cacheKey,
      activeStrategy,
      systemInstruction: buildPrimerSystemInstruction(activeStrategy),
      userPrompt: buildPrimerUserPrompt(input, words, activeStrategy),
      sanitize: sanitizePrimer,
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

/**
 * Concept Cartoon Studio. STATELESS: no cache key and skipCache, so the teacher's topic and the
 * generated cartoon are never written to disk. No accounts, no pupil or school names stored.
 */
app.post('/api/concept-cartoon', apiRateLimit, express.json({ limit: '1mb' }), async (req, res) => {
  try {
    if (!hasLlmKey(res)) return;

    const input = req.body || {};
    const topic = normalizeText(input.topic).slice(0, CARTOON_MAX_TOPIC_CHARS);
    if (topic.length < 3) {
      res.status(400).json({ error: 'A Science topic or question is required.' });
      return;
    }
    const teacherFocus = normalizeText(input.teacherFocus).slice(0, 300);
    const activeStrategy = normalizeActiveStrategy(input.activeStrategy);

    const result = await generateCoachResponse({
      skipCache: true,
      activeStrategy,
      systemInstruction: buildConceptCartoonSystemInstruction(activeStrategy),
      userPrompt: buildConceptCartoonUserPrompt(
        {
          topic,
          teacherFocus,
          yearLevel: normalizeText(input.yearLevel),
          subject: normalizeText(input.subject),
          dominantLanguage: normalizeText(input.dominantLanguage || input.homeLanguage),
        },
        activeStrategy,
      ),
      sanitize: (parsed) => sanitizeConceptCartoon(parsed, { topic, activeStrategy }),
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

// Unknown API route, any method: JSON 404. The dev-time file-write routes (/api/check-image,
// /api/save-image) were removed for allowing unauthenticated writes; they can never be reached.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
