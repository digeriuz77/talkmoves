/**
 * Concept Cartoon Studio types and pure helpers (mirrors the POST /api/concept-cartoon contract).
 * The server owns the guardrails; these helpers let the UI keep enforcing them while the teacher
 * edits bubbles (word limit, stray cast names) and reshuffle who says what.
 */
import { normalizeStrategyId } from './core6-strategies';

export const CARTOON_CAST = ['Ali', 'Bisi', 'Cempaka'] as const;
export type CartoonCharacter = (typeof CARTOON_CAST)[number];

export const CARTOON_CLAIM_TYPES = ['sound', 'misconception', 'language_trap'] as const;
export type CartoonClaimType = (typeof CARTOON_CLAIM_TYPES)[number];

/** CEFR A2 / Year 4 register limit for each English speech bubble. */
export const CARTOON_MAX_BUBBLE_WORDS = 18;

export type CartoonBridge = {
  iban: string;
  sarawakMalay: string;
  /** True when the model was not certain the Iban is everyday classroom Iban. */
  ibanNeedsTeacherCheck: boolean;
};

export type CartoonClaim = {
  id: string;
  character: CartoonCharacter;
  type: CartoonClaimType;
  english: string;
  bridge: CartoonBridge;
  teacherNote: string;
  /** Client-only: the teacher has verified the Iban phrasing for this bubble. */
  ibanChecked?: boolean;
};

export type CartoonActionMode = 'reset' | 'firm_up' | 'diagnose';

export type CartoonChip = {
  id: string;
  label: string;
  targetStrategy: string;
  nextActionMode: CartoonActionMode;
  promptContext: string;
};

export type ConceptCartoonPlan = {
  topic: string;
  activeStrategy: string;
  privacyNotice: string;
  aiNotice: string;
  claims: CartoonClaim[];
  sentenceStems: string[];
  whatIfQuestion: { english: string; bridge: string };
  followUpChips: CartoonChip[];
  warnings?: string[];
};

const CAST_NAMES = CARTOON_CAST.map((name) => name.toLowerCase());
const CAST_PATTERN = new RegExp(`\\b(?:${CARTOON_CAST.join('|')})\\b`, 'i');

export function isCartoonCharacter(value: unknown): value is CartoonCharacter {
  return typeof value === 'string' && CAST_NAMES.includes(value.toLowerCase());
}

/** Accepts the common spellings ("Language Trap", "language-trap") and returns '' when unknown. */
export function normalizeClaimType(value: unknown): CartoonClaimType | '' {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((CARTOON_CLAIM_TYPES as readonly string[]).includes(normalized)) {
    return normalized as CartoonClaimType;
  }
  if (normalized === 'correct' || normalized === 'correct_reasoning' || normalized === 'target') return 'sound';
  if (normalized === 'concept_misconception' || normalized === 'concept_error') return 'misconception';
  if (normalized === 'trap' || normalized === 'surface_trap' || normalized === 'language_or_surface_trap') {
    return 'language_trap';
  }
  return '';
}

/**
 * Whitespace-separated tokens that contain at least one letter or digit. This is the same
 * definition the server uses for the A2 limit, so the live counter matches server warnings.
 */
export function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** True when a cast name (Ali / Bisi / Cempaka) is written inside the bubble text itself. */
export function bubbleMentionsCast(text: string): boolean {
  return CAST_PATTERN.test(text);
}

/**
 * New random assignment of the three characters to the claims, so pupils cannot guess who is
 * right by name. Each character always appears exactly once across the three claims.
 */
export function shuffleCast<T extends { character: CartoonCharacter }>(
  claims: T[],
  random: () => number = Math.random,
): T[] {
  const cast: CartoonCharacter[] = [...CARTOON_CAST];
  for (let i = cast.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [cast[i], cast[j]] = [cast[j], cast[i]];
  }
  return claims.map((claim, index) => ({ ...claim, character: cast[index % cast.length] }));
}

const asText = (value: unknown, max = 600): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

function normalizeChip(chip: unknown, index: number): CartoonChip | null {
  if (!chip || typeof chip !== 'object') return null;
  const raw = chip as Record<string, unknown>;
  const label = asText(raw.label, 120);
  if (!label) return null;
  const mode = asText(raw.nextActionMode).replace(/-/g, '_');
  return {
    id: asText(raw.id, 60) || `chip_${index + 1}`,
    label,
    targetStrategy: normalizeStrategyId(raw.targetStrategy),
    nextActionMode: mode === 'reset' || mode === 'firm_up' ? mode : 'diagnose',
    promptContext: asText(raw.promptContext, 400) || label,
  };
}

/**
 * Defensive shaping of an API payload into a renderable cartoon. Throws when the server sent
 * something that is not a three-claim cartoon (the UI shows the error instead of crashing).
 */
export function normalizeCartoonPlan(value: unknown): ConceptCartoonPlan {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const claims: CartoonClaim[] = (Array.isArray(raw.claims) ? raw.claims : [])
    .map((item, index) => {
      const claim = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const bridge = (claim.bridge && typeof claim.bridge === 'object' ? claim.bridge : {}) as Record<string, unknown>;
      const english = asText(claim.english, 400);
      const iban = asText(bridge.iban);
      // Unknown values fall back by position so the teacher key can never be blank or wrong-typed.
      const fallbackType = CARTOON_CLAIM_TYPES[index % 3];
      const character = isCartoonCharacter(claim.character) ? claim.character : CARTOON_CAST[index % 3];
      return {
        id: asText(claim.id, 40) || `claim_${index + 1}`,
        character,
        type: normalizeClaimType(claim.type) || fallbackType,
        english,
        bridge: {
          iban,
          sarawakMalay: asText(bridge.sarawakMalay),
          // Same safety rule as the server: only an explicit false counts, and a missing Iban
          // bridge always needs the teacher's attention.
          ibanNeedsTeacherCheck: bridge.ibanNeedsTeacherCheck !== false || !iban,
        },
        teacherNote: asText(claim.teacherNote, 400),
      };
    })
    .filter((claim) => claim.english);

  if (claims.length !== 3) {
    throw new Error('The cartoon does not contain three claims.');
  }

  const whatIf = (raw.whatIfQuestion && typeof raw.whatIfQuestion === 'object' ? raw.whatIfQuestion : {}) as Record<string, unknown>;
  return {
    topic: asText(raw.topic, 300),
    activeStrategy: normalizeStrategyId(raw.activeStrategy),
    privacyNotice: asText(raw.privacyNotice),
    aiNotice: asText(raw.aiNotice),
    claims,
    sentenceStems: (Array.isArray(raw.sentenceStems) ? raw.sentenceStems : []).map((stem) => asText(stem, 160)).filter(Boolean),
    whatIfQuestion: { english: asText(whatIf.english, 400), bridge: asText(whatIf.bridge, 600) },
    followUpChips: (Array.isArray(raw.followUpChips) ? raw.followUpChips : [])
      .map(normalizeChip)
      .filter((chip): chip is CartoonChip => chip !== null)
      .slice(0, 3),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map((warning) => asText(warning, 300)).filter(Boolean) : [],
  };
}
