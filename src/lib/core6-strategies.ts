import raw from '../../core6_strategies.json';

/**
 * Core 6 Strategy Spine (S1–S6) of the 2027 programme.
 *
 * `core6_strategies.json` at the repo root is the single source of truth: server.js reads the
 * same file to build the cumulative spotlight prompts, so UI labels and prompts never drift.
 */
export type StrategyId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

export type Core6Strategy = {
  id: StrategyId;
  /** Locked programme name. Change only with a programme change. */
  name: string;
  /** Shorter label for pills and badges. */
  shortName: string;
  /** Sprint 1 window, e.g. "Week 3 (embed W4)". */
  window: string;
  sprint: string;
  mechanism: string;
  teacherMove: string;
  teacherMoveQuote: string;
  teacherMoveRef: string;
  pupilTarget: string;
  talkMoveIds: string[];
  coachHints: string[];
};

export const SPRINT_1: { label: string; weeks: number; pattern: string; breakWeek: number } = raw.sprint1;

export const CORE6_STRATEGIES = raw.strategies as unknown as Core6Strategy[];
export const STRATEGY_IDS: readonly StrategyId[] = CORE6_STRATEGIES.map((strategy) => strategy.id);

/** Returns a valid 'S1'–'S6' id, or '' when the value is anything else (= no spotlight). */
export function normalizeStrategyId(value: unknown): StrategyId | '' {
  if (typeof value !== 'string') return '';
  const id = value.trim().toUpperCase();
  return (STRATEGY_IDS as readonly string[]).includes(id) ? (id as StrategyId) : '';
}

export function getStrategy(value: unknown): Core6Strategy | null {
  const id = normalizeStrategyId(value);
  return CORE6_STRATEGIES.find((strategy) => strategy.id === id) ?? null;
}

/** Earlier foundational habits that still support `id` (cumulative spotlight, never banned). */
export function supportingStrategies(id: StrategyId): Core6Strategy[] {
  return CORE6_STRATEGIES.filter((strategy) => strategy.id < id);
}

export function strategyBadgeLabel(strategy: Core6Strategy | null): string {
  return strategy ? `${strategy.id} · ${strategy.shortName}` : '';
}
