import type { Metrics } from './game-progress';

export type StudentResponseType =
  | 'partial-idea'
  | 'echo'
  | 'misconception'
  | 'partner-report'
  | 'prediction'
  | 'emergent-language';

type ResponseTypeMeta = {
  label: string;
  coaching: string;
};

const RESPONSE_TYPE_META: Record<StudentResponseType, ResponseTypeMeta> = {
  'partial-idea': {
    label: 'Partial Idea',
    coaching:
      'There is real thinking here. Revoice it, add precision, and keep the pupil in the conversation.',
  },
  echo: {
    label: 'Echo',
    coaching:
      'The pupil is repeating language already in the room. Press for what they mean or ask someone to build on it.',
  },
  misconception: {
    label: 'Misconception',
    coaching:
      'The pupil is making visible a flawed idea. Surface the reasoning, then let the class test and revise it.',
  },
  'partner-report': {
    label: 'Partner Report',
    coaching:
      'This is a low-risk entry into whole-class talk. Use it to widen participation before asking for personal elaboration.',
  },
  prediction: {
    label: 'Prediction',
    coaching:
      'A prediction opens inquiry. Stay with the why so pupils connect it to evidence instead of guessing quickly.',
  },
  'emergent-language': {
    label: 'Emergent Language',
    coaching:
      'The thinking may be ahead of the English. Build from the idea first, then strengthen the language around it.',
  },
};

function countResponseTypes(responseTypes: StudentResponseType[]): Partial<Record<StudentResponseType, number>> {
  return responseTypes.reduce<Partial<Record<StudentResponseType, number>>>((counts, type) => {
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
}

export function getResponseTypeMeta(type: StudentResponseType): ResponseTypeMeta {
  return RESPONSE_TYPE_META[type];
}

export function buildDynamicAdvice(
  metrics: Metrics,
  responseTypes: StudentResponseType[],
): string[] {
  const advice: string[] = [];
  const counts = countResponseTypes(responseTypes);

  if (metrics.participation < 45) {
    advice.push(
      'Too much of the room stayed peripheral. Use more no-hands-up routines, pair rehearsal, and targeted invitations after talk time.',
    );
  }

  if (metrics.reasoning < 50) {
    advice.push(
      'The discussion needed more development moves. Ask for why, evidence, comparison, or revision before settling on an answer.',
    );
  }

  if (metrics.ownership < 50) {
    advice.push(
      'Teacher control stayed high. Let pupils carry more of the explanation publicly, even when the English is still rough.',
    );
  }

  if ((counts['partial-idea'] ?? 0) >= 2) {
    advice.push(
      'You saw several partial ideas. In this classroom context, those are the moments to extend, revoice, and connect rather than replace.',
    );
  }

  if ((counts.misconception ?? 0) >= 1) {
    advice.push(
      'Misconceptions surfaced. Keep pressing for why pupils think that, then use the class to test and revise the idea.',
    );
  }

  if ((counts.echo ?? 0) >= 2) {
    advice.push(
      'Several responses echoed teacher or peer language. Follow up with "What do you mean?" or "Who can add a new reason?" so talk does not stay superficial.',
    );
  }

  if ((counts['emergent-language'] ?? 0) >= 1) {
    advice.push(
      'Some pupils had the thinking before they had the English. Revoice strategically and use stems so language support does not become teacher takeover.',
    );
  }

  return advice;
}
