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

function createCacheKey(input) {
  const normalized = {
    question: normalizeText(input.question).toLowerCase(),
    yearLevel: normalizeText(input.yearLevel).toLowerCase(),
    topic: normalizeText(input.topic).toLowerCase(),
    dominantLanguage: normalizeText(input.dominantLanguage).toLowerCase(),
    classProfile: normalizeText(input.classProfile).toLowerCase(),
    vocabulary: Array.isArray(input.vocabulary)
      ? input.vocabulary.map((v) => normalizeText(v).toLowerCase()).filter(Boolean).sort()
      : [],
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

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
    `Class Profile: ${normalizeText(input.classProfile) || 'Lower-performing pupils; language and concept support needed.'}`,
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

async function callGemini({ model, systemInstruction, userPrompt }) {
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
  return sanitizePlan(parsed);
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

    counters = normalizeCounters(counters);

    const cacheKey = createCacheKey(input);
    const cached = planCache[cacheKey];
    if (cached?.plan) {
      res.json({
        plan: cached.plan,
        meta: {
          fromCache: true,
          modelUsed: cached.modelUsed || 'cache',
          counters,
          mode: counters.proCalls >= PRIMARY_MODEL_SWITCH_THRESHOLD ? 'high-speed' : 'high-quality',
        },
      });
      return;
    }

    const canUsePrimary =
      counters.proCalls < PRIMARY_MODEL_SWITCH_THRESHOLD && counters.proCalls < PRIMARY_MODEL_LIMIT;
    const canUseFallback = counters.flashCalls < FALLBACK_MODEL_LIMIT;
    if (!canUsePrimary && !canUseFallback) {
      res.status(429).json({ error: 'Daily model limits reached. Please try again tomorrow (UTC).' });
      return;
    }

    const systemInstruction = buildSystemInstruction();
    const userPrompt = buildUserPrompt(input);

    let modelUsed = canUsePrimary ? PRIMARY_MODEL_NAME : FALLBACK_MODEL_NAME;
    let plan;

    try {
      plan = await callGemini({ model: modelUsed, systemInstruction, userPrompt });
    } catch (primaryError) {
      const fallbackAllowed = modelUsed === PRIMARY_MODEL_NAME && canUseFallback;
      if (!fallbackAllowed) throw primaryError;
      modelUsed = FALLBACK_MODEL_NAME;
      plan = await callGemini({ model: modelUsed, systemInstruction, userPrompt });
    }

    if (modelUsed === PRIMARY_MODEL_NAME) counters.proCalls += 1;
    else counters.flashCalls += 1;

    writeJson(COUNTERS_PATH, counters);

    planCache[cacheKey] = {
      createdAt: Date.now(),
      modelUsed,
      plan,
    };
    planCache = pruneCache(planCache);
    writeJson(CACHE_PATH, planCache);

    res.json({
      plan,
      meta: {
        fromCache: false,
        modelUsed,
        counters,
        mode: modelUsed === PRIMARY_MODEL_NAME ? 'high-quality' : 'high-speed',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
