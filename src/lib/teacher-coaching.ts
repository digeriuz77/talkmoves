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

export type CoachingSignal =
  | 'low-participation'
  | 'low-reasoning'
  | 'low-ownership'
  | 'partial-ideas-visible'
  | 'misconception-visible'
  | 'echo-heavy'
  | 'emergent-language-visible';

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

export function buildCoachingSignals(
  metrics: Metrics,
  responseTypes: StudentResponseType[],
): CoachingSignal[] {
  const signals: CoachingSignal[] = [];
  const counts = countResponseTypes(responseTypes);

  if (metrics.participation < 45) {
    signals.push('low-participation');
  }

  if (metrics.reasoning < 50) {
    signals.push('low-reasoning');
  }

  if (metrics.ownership < 50) {
    signals.push('low-ownership');
  }

  if ((counts['partial-idea'] ?? 0) >= 2) {
    signals.push('partial-ideas-visible');
  }

  if ((counts.misconception ?? 0) >= 1) {
    signals.push('misconception-visible');
  }

  if ((counts.echo ?? 0) >= 2) {
    signals.push('echo-heavy');
  }

  if ((counts['emergent-language'] ?? 0) >= 1) {
    signals.push('emergent-language-visible');
  }

  return signals;
}

export function buildDynamicAdvice(
  metrics: Metrics,
  responseTypes: StudentResponseType[],
): string[] {
  const signalToAdvice: Record<CoachingSignal, string> = {
    'low-participation':
      'Too few pupils joined the talk. Use pair talk, wait time, or a wider mix of voices.',
    'low-reasoning':
      'The class needed more "why" and "how" before settling on an answer.',
    'low-ownership':
      'You carried too much of the talk. Let pupils explain more in their own words.',
    'partial-ideas-visible':
      'You heard several half-formed ideas. Stay with them and help pupils build them.',
    'misconception-visible':
      'A wrong idea came up. Ask for the thinking first, then let the class test it.',
    'echo-heavy':
      'Some answers only repeated teacher or peer words. Ask, "What do you mean?" or "Who can add a new idea?"',
    'emergent-language-visible':
      'Some pupils had the idea before the English. Keep the idea alive first, then support the English.',
  };

  return buildCoachingSignals(metrics, responseTypes).map((signal) => signalToAdvice[signal]);
}
