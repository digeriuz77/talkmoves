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
      'Too few pupils joined the talk. Use pair talk, wait time, or a wider mix of voices.',
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
        'You heard several half-formed ideas. Stay with them and help pupils build them.',
        'A wrong idea came up. Ask for the thinking first, then let the class test it.',
      ]),
    );
  });
});
