import { describe, expect, it } from 'vitest';
import { buildDynamicAdviceKeys, getResponseTypeMeta } from './teacher-coaching';

describe('teacher coaching', () => {
  it('returns translation key metadata for each response type', () => {
    const meta = getResponseTypeMeta('partial-idea');
    expect(meta.labelKey).toBe('response.partialIdea');
    expect(meta.coachingKey).toBe('response.partialIdea.coaching');
  });

  it('builds advice keys from weak participation and echo-heavy patterns', () => {
    expect(
      buildDynamicAdviceKeys(
        {
          participation: 38,
          reasoning: 66,
          ownership: 41,
        },
        ['echo', 'echo', 'partial-idea'],
      ),
    ).toContain('advice.lowParticipation');
  });

  it('builds advice keys for partial ideas and misconceptions', () => {
    const advice = buildDynamicAdviceKeys(
      {
        participation: 64,
        reasoning: 44,
        ownership: 60,
      },
      ['partial-idea', 'misconception', 'partial-idea'],
    );
    expect(advice).toContain('advice.partialIdeas');
    expect(advice).toContain('advice.misconceptions');
  });
});
