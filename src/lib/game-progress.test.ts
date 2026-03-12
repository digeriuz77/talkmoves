import { describe, expect, it } from 'vitest';
import {
  applyMetricDelta,
  calculateCompositeScore,
  createMetrics,
  isPassingScore,
  summarizeLabels,
} from './game-progress';

describe('game-progress helpers', () => {
  it('fills missing metrics with neutral defaults', () => {
    expect(createMetrics({ participation: 72 })).toEqual({
      participation: 72,
      reasoning: 50,
      ownership: 50,
    });
  });

  it('applies deltas and clamps metric ranges', () => {
    expect(
      applyMetricDelta(
        {
          participation: 95,
          reasoning: 40,
          ownership: 3,
        },
        {
          participation: 12,
          reasoning: -15,
          ownership: -20,
        },
      ),
    ).toEqual({
      participation: 100,
      reasoning: 25,
      ownership: 0,
    });
  });

  it('averages metrics into a rounded composite score', () => {
    expect(
      calculateCompositeScore({
        participation: 81,
        reasoning: 72,
        ownership: 66,
      }),
    ).toBe(73);
  });

  it('checks passing threshold against the composite score', () => {
    expect(
      isPassingScore(
        {
          participation: 80,
          reasoning: 74,
          ownership: 70,
        },
        72,
      ),
    ).toBe(true);

    expect(
      isPassingScore(
        {
          participation: 52,
          reasoning: 48,
          ownership: 44,
        },
        60,
      ),
    ).toBe(false);
  });

  it('summarizes repeated labels for end-screen reflection', () => {
    expect(
      summarizeLabels(['Wait Time', 'Add On', 'Wait Time', 'Reasoning']),
    ).toEqual({
      'Wait Time': 2,
      'Add On': 1,
      Reasoning: 1,
    });
  });
});
