import { describe, expect, it } from 'vitest';
import {
  CORE6_STRATEGIES,
  getStrategy,
  normalizeStrategyId,
  strategyBadgeLabel,
  supportingStrategies,
} from './core6-strategies';

const LOCKED_NAMES: Record<string, string> = {
  S1: 'Open Question + Wait Time (5–7s)',
  S2: 'Safe Rehearsal (Think-Pair-Share + L1 Bridge)',
  S3: 'Deliberate Vocabulary & EAL Sentence Ladder',
  S4: 'Uptake Moves (Revoice, Probe & Evidence)',
  S5: 'Whole-Class Check & Adapt (AfL)',
  S6: 'Competing Claims & What-If Transfer (Concept Cartoons)',
};

describe('Core 6 Strategy Spine (shared matrix)', () => {
  it('defines S1–S6 in spine order with the programme’s locked names', () => {
    expect(CORE6_STRATEGIES.map((strategy) => strategy.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
    for (const strategy of CORE6_STRATEGIES) {
      expect(strategy.name).toBe(LOCKED_NAMES[strategy.id]);
      expect(strategy.shortName).not.toBe('');
      expect(strategy.window).not.toBe('');
      expect(strategy.mechanism).not.toBe('');
      expect(strategy.teacherMoveQuote).not.toBe('');
      expect(strategy.pupilTarget).not.toBe('');
    }
  });

  it('maps the Sprint 1 windows (4 on / 1 break / 4 on)', () => {
    const windows = Object.fromEntries(CORE6_STRATEGIES.map((strategy) => [strategy.id, strategy.window]));
    expect(windows).toEqual({
      S1: 'Week 1 (embed W4)',
      S2: 'Week 2 (embed W4)',
      S3: 'Week 3 (embed W4)',
      S4: 'Weeks 6–7',
      S5: 'Week 7',
      S6: 'Week 8–9 & Sprint 2',
    });
  });

  it('normalises ids and rejects anything outside S1–S6', () => {
    expect(normalizeStrategyId('s3')).toBe('S3');
    expect(normalizeStrategyId(' S6 ')).toBe('S6');
    for (const invalid of ['', 'S0', 'S7', 'T1', 3, null, undefined, {}, '<script>']) {
      expect(normalizeStrategyId(invalid), String(invalid)).toBe('');
    }
    expect(getStrategy('s4')?.id).toBe('S4');
    expect(getStrategy('nope')).toBeNull();
    expect(getStrategy(undefined)).toBeNull();
  });

  it('lists every earlier strategy as supporting (cumulative spotlight)', () => {
    expect(supportingStrategies('S1')).toEqual([]);
    expect(supportingStrategies('S3').map((strategy) => strategy.id)).toEqual(['S1', 'S2']);
    expect(supportingStrategies('S6').map((strategy) => strategy.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5']);
  });

  it('builds badge labels from the short names', () => {
    expect(strategyBadgeLabel(getStrategy('S5'))).toBe('S5 · Whole-Class Check & Adapt');
    expect(strategyBadgeLabel(null)).toBe('');
  });
});
