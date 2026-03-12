import { describe, expect, it } from 'vitest';
import { getLevelStatus, updateLevelProgress } from './level-progress';

describe('level progress', () => {
  it('creates a new progress entry on first completion', () => {
    expect(
      updateLevelProgress({}, 'no-hands-up', {
        completed: true,
        score: 74,
      }),
    ).toEqual({
      'no-hands-up': {
        attempts: 1,
        bestScore: 74,
        completed: true,
      },
    });
  });

  it('increments attempts and preserves the best score', () => {
    expect(
      updateLevelProgress(
        {
          'no-hands-up': {
            attempts: 2,
            bestScore: 81,
            completed: false,
          },
        },
        'no-hands-up',
        {
          completed: false,
          score: 67,
        },
      ),
    ).toEqual({
      'no-hands-up': {
        attempts: 3,
        bestScore: 81,
        completed: false,
      },
    });
  });

  it('marks a level completed once any run passes', () => {
    expect(
      getLevelStatus({
        'wait-time-mastery': {
          attempts: 4,
          bestScore: 72,
          completed: true,
        },
      }, 'wait-time-mastery'),
    ).toEqual({
      attempts: 4,
      bestScore: 72,
      completed: true,
      statusLabel: 'Completed',
    });
  });
});
