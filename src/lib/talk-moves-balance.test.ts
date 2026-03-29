import { describe, expect, it } from 'vitest';
import { talkMoveScenarios, calculateChainMetrics } from '../data/talk_moves';
import { applyMetricDelta, calculateCompositeScore, createMetrics } from './game-progress';
import { assessTalkMoveChain } from './talk-moves-balance';

describe('talk moves balance', () => {
  it('penalizes closing the turn without any setup move', () => {
    expect(assessTalkMoveChain(['TM-T04'])).toEqual(
      expect.objectContaining({
        quality: 'weak',
        adjustment: {
          participation: -6,
          reasoning: -12,
          ownership: -8,
        },
      }),
    );
  });

  it('rewards a combo chain that sets up the closing move', () => {
    expect(assessTalkMoveChain(['TM-T01', 'TM-T04'])).toEqual(
      expect.objectContaining({
        quality: 'strong',
        adjustment: {
          participation: 3,
          reasoning: 4,
          ownership: 3,
        },
      }),
    );
  });

  it('makes a terminal-only ice-melt run fail the scenario threshold', () => {
    const score = simulateScenario(
      'iceMelt',
      [['TM-T04'], ['TM-T04'], ['TM-T04'], ['TM-T04'], ['TM-T04'], ['TM-T04'], ['TM-T14'], ['TM-T14']],
    );

    expect(score).toBeLessThan(talkMoveScenarios.iceMelt.passThreshold);
  });

  it('still lets a well-built share-out run pass', () => {
    const score = simulateScenario(
      'shareOutSampling',
      [['TM-T03', 'TM-T04'], ['TM-T02', 'TM-T05'], ['TM-T03', 'TM-T06'], ['TM-T03', 'TM-T04'], ['TM-T13']],
    );

    expect(score).toBeGreaterThanOrEqual(talkMoveScenarios.shareOutSampling.passThreshold);
  });
});

function simulateScenario(
  scenarioId: keyof typeof talkMoveScenarios,
  chains: string[][],
): number {
  const scenario = talkMoveScenarios[scenarioId];
  let metrics = createMetrics(scenario.startingMetrics);
  let previousTerminalMoveId: string | undefined;

  for (const chain of chains) {
    metrics = applyMetricDelta(metrics, calculateChainMetrics(chain));
    const assessment = assessTalkMoveChain(chain, previousTerminalMoveId);
    metrics = applyMetricDelta(metrics, assessment.adjustment);
    previousTerminalMoveId = assessment.terminalMoveId;
  }

  return calculateCompositeScore(metrics);
}
