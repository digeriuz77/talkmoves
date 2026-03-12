import { describe, expect, it } from 'vitest';
import { buildDynamicAdvice, getResponseTypeMeta } from './teacher-coaching';

describe('teacher coaching', () => {
  it('returns readable metadata for each response type', () => {
    expect(getResponseTypeMeta('partial-idea')).toEqual({
      label: 'Partial Idea',
      coaching:
        'There is real thinking here. Revoice it, add precision, and keep the pupil in the conversation.',
    });
  });

  it('builds advice from weak participation and echo-heavy patterns', () => {
    expect(
      buildDynamicAdvice(
        {
          participation: 38,
          reasoning: 66,
          ownership: 41,
        },
        ['echo', 'echo', 'partial-idea'],
      ),
    ).toContain(
      'Too much of the room stayed peripheral. Use more no-hands-up routines, pair rehearsal, and targeted invitations after talk time.',
    );
  });

  it('builds advice for partial ideas and misconceptions instead of generic right-answer feedback', () => {
    expect(
      buildDynamicAdvice(
        {
          participation: 64,
          reasoning: 44,
          ownership: 60,
        },
        ['partial-idea', 'misconception', 'partial-idea'],
      ),
    ).toEqual(
      expect.arrayContaining([
        'You saw several partial ideas. In this classroom context, those are the moments to extend, revoice, and connect rather than replace.',
        'Misconceptions surfaced. Keep pressing for why pupils think that, then use the class to test and revise the idea.',
      ]),
    );
  });
});
