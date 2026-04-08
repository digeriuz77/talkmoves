import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PRO_MODEL_NAME = process.env.PRO_MODEL_NAME || 'gemini-2.5-pro';
const FLASH_MODEL_NAME = process.env.FLASH_MODEL_NAME || 'gemini-2.0-flash-lite';
const PRO_MODEL_LIMIT = Number(process.env.PRO_MODEL_LIMIT || 1000);
const PRO_MODEL_SWITCH_THRESHOLD = Number(process.env.PRO_MODEL_SWITCH_THRESHOLD || 950);
const FLASH_MODEL_LIMIT = Number(process.env.FLASH_MODEL_LIMIT || 150000);

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

function extractCandidateText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
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
  };
}

function buildSystemInstruction() {
  return [
    'You are a Pedagogical Language Bridge expert.',
    "Task: transform a teacher's open question into a Dialogic Scaffolding Map.",
    'Target learners: lower-performing primary pupils transitioning from Malay/Iban into English.',
    'Use very simple language. Keep each line short and classroom-usable.',
    'If uncertain about exact Iban, use Sarawak Malay as the bridge language and do not invent unsafe Iban.',
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
    '  "quickBoardReadyLines": string[]',
    '}',
  ].join('\n');
}

function buildUserPrompt(input) {
  const safeVocabulary = Array.isArray(input.vocabulary)
    ? input.vocabulary.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  return [
    `Teacher Question: ${normalizeText(input.question)}`,
    `Year Level: ${normalizeText(input.yearLevel) || 'Year 2'}`,
    `Topic/Subject: ${normalizeText(input.topic) || 'General classroom discussion'}`,
    `Dominant Home Language: ${normalizeText(input.dominantLanguage) || 'Iban'}`,
    `Class Profile: ${normalizeText(input.classProfile) || 'Lower-performing pupils; language and concept support needed.'}`,
    `Priority Vocabulary: ${safeVocabulary.join(', ') || 'Use topic-specific assessment vocabulary.'}`,
    'Requirements:',
    '- Keep outputs practical for live teaching.',
    '- Include likely weak-content responses (not only language errors).',
    '- Revoicing must model short, grammatical English.',
    '- Pressing question must be simple English + Malay translation in brackets style.',
    '- Follow-up map should cover at least three student-response paths.',
  ].join('\n');
}

async function callGemini({ model, systemInstruction, userPrompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.35,
      topP: 0.9,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message || `Gemini request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const text = extractCandidateText(body);
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
          mode: counters.proCalls >= PRO_MODEL_SWITCH_THRESHOLD ? 'high-speed' : 'high-quality',
        },
      });
      return;
    }

    const canUsePro = counters.proCalls < PRO_MODEL_SWITCH_THRESHOLD && counters.proCalls < PRO_MODEL_LIMIT;
    const canUseFlash = counters.flashCalls < FLASH_MODEL_LIMIT;
    if (!canUsePro && !canUseFlash) {
      res.status(429).json({ error: 'Daily model limits reached. Please try again tomorrow (UTC).' });
      return;
    }

    const systemInstruction = buildSystemInstruction();
    const userPrompt = buildUserPrompt(input);

    let modelUsed = canUsePro ? PRO_MODEL_NAME : FLASH_MODEL_NAME;
    let plan;

    try {
      plan = await callGemini({ model: modelUsed, systemInstruction, userPrompt });
    } catch (primaryError) {
      const fallbackAllowed = modelUsed === PRO_MODEL_NAME && canUseFlash;
      if (!fallbackAllowed) throw primaryError;
      modelUsed = FLASH_MODEL_NAME;
      plan = await callGemini({ model: modelUsed, systemInstruction, userPrompt });
    }

    if (modelUsed === PRO_MODEL_NAME) counters.proCalls += 1;
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
        mode: modelUsed === PRO_MODEL_NAME ? 'high-quality' : 'high-speed',
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
