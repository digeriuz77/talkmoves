import type { Metrics } from './game-progress';

export type StudentResponseType =
  | 'partial-idea'
  | 'echo'
  | 'misconception'
  | 'partner-report'
  | 'prediction'
  | 'emergent-language';

export type ResponseTypeMeta = {
  labelKey: string;
  coachingKey: string;
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
    labelKey: 'response.partialIdea',
    coachingKey: 'response.partialIdea.coaching',
  },
  echo: {
    labelKey: 'response.echo',
    coachingKey: 'response.echo.coaching',
  },
  misconception: {
    labelKey: 'response.misconception',
    coachingKey: 'response.misconception.coaching',
  },
  'partner-report': {
    labelKey: 'response.partnerReport',
    coachingKey: 'response.partnerReport.coaching',
  },
  prediction: {
    labelKey: 'response.prediction',
    coachingKey: 'response.prediction.coaching',
  },
  'emergent-language': {
    labelKey: 'response.emergentLanguage',
    coachingKey: 'response.emergentLanguage.coaching',
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
export function buildDynamicAdviceKeys(
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
    advice.push('advice.lowParticipation');
  }

  if (metrics.reasoning < 50) {
    advice.push('advice.lowReasoning');
  }

  if (metrics.ownership < 50) {
    advice.push('advice.lowOwnership');
  }

  if ((counts['partial-idea'] ?? 0) >= 2) {
    advice.push('advice.partialIdeas');
  }

  if ((counts.misconception ?? 0) >= 1) {
    advice.push('advice.misconceptions');
  }

  if ((counts.echo ?? 0) >= 2) {
    advice.push('advice.echoes');
  }

  if ((counts['emergent-language'] ?? 0) >= 1) {
    advice.push('advice.emergentLang');
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

// Legacy wrapper for backward compatibility
export function buildDynamicAdvice(
  metrics: Metrics,
  responseTypes: StudentResponseType[],
): string[] {
  return buildDynamicAdviceKeys(metrics, responseTypes);
}
