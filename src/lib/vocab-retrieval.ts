// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import type { CurriculumWord } from '../data/curriculum';

export type WordReviewRecord = {
  taughtAt: number;
  lastReviewedAt?: number;
  reviewCount: number;
};

export type VocabReviewMap = Record<string, WordReviewRecord>;

export const VOCAB_REVIEW_STORAGE_KEY = 'tmb.vocabReview.v1';

const DAY_MS = 24 * 60 * 60 * 1000;

export function loadVocabReviewMap(): VocabReviewMap {
  try {
    const raw = window.localStorage.getItem(VOCAB_REVIEW_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as VocabReviewMap;
  } catch {
    return {};
  }
}

export function saveVocabReviewMap(map: VocabReviewMap): void {
  try {
    window.localStorage.setItem(VOCAB_REVIEW_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage unavailable
  }
}

export function markWordsTaught(
  current: VocabReviewMap,
  wordIds: string[],
  now = Date.now(),
): VocabReviewMap {
  const next: VocabReviewMap = { ...current };
  for (const id of wordIds) {
    if (!next[id]) {
      next[id] = { taughtAt: now, reviewCount: 0 };
    }
  }
  return next;
}

export function recordWordsReviewed(
  current: VocabReviewMap,
  wordIds: string[],
  now = Date.now(),
): VocabReviewMap {
  const next: VocabReviewMap = { ...current };
  for (const id of wordIds) {
    const prev = next[id];
    next[id] = {
      taughtAt: prev?.taughtAt ?? now,
      lastReviewedAt: now,
      reviewCount: (prev?.reviewCount ?? 0) + 1,
    };
  }
  return next;
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 50 / 30 / 20 Spaced Retrieval Picker ("Quick-Fire 5"):
 * Picks ~40% recent (<= 7 days), ~40% mid-term (8–28 days), ~20% older (> 28 days)
 * from words marked taught, falling back gracefully when fewer age buckets exist.
 */
export function selectSpacedRetrievalWords<T extends CurriculumWord>(
  pool: T[],
  reviewMap: VocabReviewMap,
  count = 5,
  now = Date.now(),
): { words: T[]; fromTaughtCount: number } {
  const taughtWords = pool.filter((w) => Boolean(reviewMap[w.id]));
  if (taughtWords.length === 0) {
    return { words: shuffleArray(pool).slice(0, count), fromTaughtCount: 0 };
  }

  const recent: T[] = [];
  const midterm: T[] = [];
  const older: T[] = [];

  for (const word of taughtWords) {
    const rec = reviewMap[word.id];
    const ageDays = (now - rec.taughtAt) / DAY_MS;
    if (ageDays <= 7) recent.push(word);
    else if (ageDays <= 28) midterm.push(word);
    else older.push(word);
  }

  // Prioritize less-reviewed words within each bucket
  const sortByReviewNeed = (arr: T[]) =>
    shuffleArray(arr).sort((a, b) => (reviewMap[a.id]?.reviewCount ?? 0) - (reviewMap[b.id]?.reviewCount ?? 0));

  const picked: T[] = [];
  const takeFrom = (bucket: T[], limit: number) => {
    for (const item of sortByReviewNeed(bucket)) {
      if (picked.length >= count) break;
      if (limit <= 0) break;
      if (!picked.some((p) => p.id === item.id)) {
        picked.push(item);
        limit -= 1;
      }
    }
  };

  // For count = 5: 2 recent, 2 mid-term, 1 older
  const recentQuota = Math.max(1, Math.round(count * 0.4));
  const midQuota = Math.max(1, Math.round(count * 0.4));
  const oldQuota = Math.max(1, count - recentQuota - midQuota);

  takeFrom(recent, recentQuota);
  takeFrom(midterm, midQuota);
  takeFrom(older, oldQuota);

  // Fill any remaining slots from remaining taught words
  if (picked.length < count) {
    takeFrom(taughtWords, count - picked.length);
  }

  return { words: picked, fromTaughtCount: taughtWords.length };
}
