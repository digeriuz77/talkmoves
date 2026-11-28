import { describe, expect, it } from 'vitest';
import {
  CARTOON_CAST,
  bubbleMentionsCast,
  countWords,
  normalizeCartoonPlan,
  normalizeClaimType,
  shuffleCast,
  type CartoonClaim,
} from './concept-cartoon';

function claim(id: string, character: (typeof CARTOON_CAST)[number]): CartoonClaim {
  return {
    id,
    character,
    type: 'sound',
    english: 'The sun dries the shirt.',
    bridge: { iban: 'Matahari rangkai baju.', sarawakMalay: 'Matahari keringkan baju.', ibanNeedsTeacherCheck: false },
    teacherNote: '',
  };
}

describe('concept cartoon helpers', () => {
  it('counts words the same way the server enforces the A2 limit', () => {
    expect(countWords('Heat from the sun turns liquid water into invisible gas that moves into the air.')).toBe(15);
    expect(countWords('I think ___ because ___.')).toBe(3);
    expect(countWords('e.g. water-vapour')).toBe(2);
    expect(countWords('')).toBe(0);
    expect(countWords('   \n ')).toBe(0);
  });

  it('detects cast names written inside a bubble, in any letter case', () => {
    expect(bubbleMentionsCast('I agree with Cempaka about the water.')).toBe(true);
    expect(bubbleMentionsCast('ali says the shirt melts')).toBe(true);
    expect(bubbleMentionsCast('The shirt is melting in the hot sun.')).toBe(false);
    expect(bubbleMentionsCast('Bismillah is not a cast name')).toBe(false);
  });

  it('shuffles the cast so each character appears exactly once', () => {
    const claims = [claim('claim_1', 'Ali'), claim('claim_2', 'Ali'), claim('claim_3', 'Ali')];
    for (let round = 0; round < 20; round += 1) {
      const shuffled = shuffleCast(claims);
      expect(shuffled.map((item) => item.character).sort()).toEqual([...CARTOON_CAST].sort());
      expect(shuffled.map((item) => item.id)).toEqual(['claim_1', 'claim_2', 'claim_3']);
    }
    // Deterministic source: always the same permutation.
    const fixed = shuffleCast(claims, () => 0);
    expect(fixed.map((item) => item.character)).toEqual(shuffleCast(claims, () => 0).map((item) => item.character));
    expect(claims.every((item) => item.character === 'Ali')).toBe(true);
  });

  it('shapes a server payload and repairs unknown characters and types', () => {
    const plan = normalizeCartoonPlan({
      topic: 'Evaporation',
      activeStrategy: 's6',
      claims: [
        { id: 'claim_1', character: 'Dina', type: 'SOUND', english: 'Heat turns water to gas.', bridge: { iban: 'Ai nyadi wap.', sarawakMalay: 'Aik jadi wap.' }, teacherNote: 'ok' },
        { type: 'Language Trap', english: 'The water disappears.', bridge: { iban: '', sarawakMalay: 'Aik hilang.', ibanNeedsTeacherCheck: false } },
        { character: 'Cempaka', type: 'not-a-type', english: 'The shirt is melting.', bridge: { iban: 'Baju cair.', sarawakMalay: 'Baju cair.', ibanNeedsTeacherCheck: true } },
      ],
      sentenceStems: ['I agree with ___ because ___.', 42],
      whatIfQuestion: { english: 'What if it rained?', bridge: 'Enti ujan?' },
      followUpChips: [
        { id: 'a', label: 'Most picked the misconception', nextActionMode: 'reset', targetStrategy: 'S5' },
        { label: 'Stuck on English', nextActionMode: 'firm-up', targetStrategy: 'S3' },
        { label: '', nextActionMode: 'reset' },
      ],
      warnings: ['A warning.'],
    });

    expect(plan.activeStrategy).toBe('S6');
    expect(plan.claims.map((item) => item.character)).toEqual(['Ali', 'Bisi', 'Cempaka']);
    expect(plan.claims.map((item) => item.type)).toEqual([
      'sound', // case-insensitive
      'language_trap', // separator-insensitive
      'language_trap', // unknown => positional fallback (third claim)
    ]);
    expect(plan.claims[1].id).toBe('claim_2');
    expect(plan.claims[1].bridge.ibanNeedsTeacherCheck).toBe(true); // missing flag => needs check
    expect(plan.claims[2].bridge.ibanNeedsTeacherCheck).toBe(true);
    expect(plan.sentenceStems).toEqual(['I agree with ___ because ___.']);
    expect(plan.followUpChips).toHaveLength(2);
    expect(plan.followUpChips[1]).toMatchObject({ id: 'chip_2', nextActionMode: 'firm_up', promptContext: 'Stuck on English' });
    expect(plan.warnings).toEqual(['A warning.']);
  });

  it('normalises claim type spellings', () => {
    expect(normalizeClaimType('sound')).toBe('sound');
    expect(normalizeClaimType(' Misconception ')).toBe('misconception');
    expect(normalizeClaimType('language trap')).toBe('language_trap');
    expect(normalizeClaimType('correct_reasoning')).toBe('sound');
    expect(normalizeClaimType('surface_trap')).toBe('language_trap');
    expect(normalizeClaimType('banana')).toBe('');
    expect(normalizeClaimType(7)).toBe('');
  });

  it('refuses payloads that are not a three-claim cartoon', () => {
    expect(() => normalizeCartoonPlan({ claims: [] })).toThrow('three claims');
    expect(() => normalizeCartoonPlan(null)).toThrow('three claims');
  });
});
