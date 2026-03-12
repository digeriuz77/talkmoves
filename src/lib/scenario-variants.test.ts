import { describe, expect, it } from 'vitest';
import { getVariantValue, resolveScenarioNode } from './scenario-variants';

describe('scenario variants', () => {
  it('falls back to the primary value when no alternates exist', () => {
    expect(getVariantValue('Base text', undefined, 'node-a', 0)).toBe('Base text');
  });

  it('selects deterministic alternates from the same seed', () => {
    const first = getVariantValue('Base text', ['Alt 1', 'Alt 2'], 'node-a', 3);
    const second = getVariantValue('Base text', ['Alt 1', 'Alt 2'], 'node-a', 3);

    expect(first).toBe(second);
  });

  it('changes the selected variant when the playthrough seed changes', () => {
    const seedZero = getVariantValue('Base text', ['Alt 1', 'Alt 2', 'Alt 3'], 'node-a', 0);
    const seedOne = getVariantValue('Base text', ['Alt 1', 'Alt 2', 'Alt 3'], 'node-a', 1);

    expect(seedZero).not.toBe(seedOne);
  });

  it('resolves both text and pressure cue variants together', () => {
    const resolved = resolveScenarioNode(
      {
        text: 'Base',
        alternateTexts: ['Alt 1'],
        pressureCue: 'Pressure base',
        alternatePressureCues: ['Pressure alt'],
      },
      'node-b',
      4,
    );

    expect(['Base', 'Alt 1']).toContain(resolved.text);
    expect(['Pressure base', 'Pressure alt']).toContain(resolved.pressureCue);
  });
});
