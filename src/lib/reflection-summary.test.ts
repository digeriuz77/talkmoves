import { describe, expect, it } from 'vitest';
import { createReflectionSummary } from './reflection-summary';

describe('reflection summary', () => {
  it('builds a positive summary for a strong run', () => {
    const summary = createReflectionSummary({
      title: 'Counting Blocks',
      outcome: 'win',
      finalScore: 72,
      passThreshold: 65,
      metrics: {
        participation: 70,
        reasoning: 76,
        ownership: 71,
      },
      responseTypes: ['partial-idea', 'emergent-language'],
      moveLabels: ['Wait Time', 'Say More', 'Add On'],
    });

    expect(summary.headline).toBe('Ideas got stronger.');
    expect(summary.summary).toContain('You reached the goal');
    expect(summary.strength).toContain('why');
    expect(summary.evidence).toContain('You used a good mix of talk moves.');
  });

  it('gives a focused next step when the talk closes too quickly', () => {
    const summary = createReflectionSummary({
      title: 'Sorting Shapes',
      outcome: 'loss',
      finalScore: 61,
      passThreshold: 65,
      metrics: {
        participation: 67,
        reasoning: 48,
        ownership: 68,
      },
      responseTypes: ['partial-idea'],
      moveLabels: ['Evaluation', 'Evaluation', 'Say More'],
    });

    expect(summary.headline).toBe('You were close.');
    expect(summary.risk).toContain("why");
    expect(summary.nextStep).toContain('ask one more');
  });

  it('adds a language note for partial English and Malay support', () => {
    const summary = createReflectionSummary({
      title: 'Why Does Ice Melt?',
      outcome: 'loss',
      finalScore: 57,
      passThreshold: 60,
      metrics: {
        participation: 56,
        reasoning: 55,
        ownership: 52,
      },
      responseTypes: ['emergent-language', 'partial-idea'],
      moveLabels: ['Revoicing', 'Wait Time'],
      supportLanguage: 'Malay',
    });

    expect(summary.languageNote).toContain('Malay');
    expect(summary.languageNote).toContain('simple English');
  });

  it('does not add a language note without explicit language support context', () => {
    const summary = createReflectionSummary({
      title: 'Counting Blocks',
      outcome: 'loss',
      finalScore: 58,
      passThreshold: 65,
      metrics: {
        participation: 58,
        reasoning: 56,
        ownership: 54,
      },
      responseTypes: ['emergent-language'],
      moveLabels: ['Wait Time', 'Revoicing'],
    });

    expect(summary.languageNote).toBeUndefined();
  });

  it('uses a readable loss headline on bigger misses', () => {
    const summary = createReflectionSummary({
      title: 'Sorting Shapes',
      outcome: 'loss',
      finalScore: 54,
      passThreshold: 65,
      metrics: {
        participation: 67,
        reasoning: 44,
        ownership: 58,
      },
      responseTypes: ['partial-idea'],
      moveLabels: ['Evaluation', 'Say More'],
    });

    expect(summary.headline).toBe('Ideas needed more time.');
  });
});
