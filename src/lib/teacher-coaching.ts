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

export type CoachingSignal =
  | 'low-participation'
  | 'low-reasoning'
  | 'low-ownership'
  | 'partial-ideas-visible'
  | 'misconception-visible'
  | 'echo-heavy'
  | 'emergent-language-visible';

const SIGNAL_TO_ADVICE_KEY: Record<CoachingSignal, string> = {
  'low-participation': 'advice.lowParticipation',
  'low-reasoning': 'advice.lowReasoning',
  'low-ownership': 'advice.lowOwnership',
  'partial-ideas-visible': 'advice.partialIdeas',
  'misconception-visible': 'advice.misconceptions',
  'echo-heavy': 'advice.echoes',
  'emergent-language-visible': 'advice.emergentLang',
};

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

export function buildDynamicAdviceKeys(metrics: Metrics, responseTypes: StudentResponseType[]): string[] {
  return buildCoachingSignals(metrics, responseTypes).map((signal) => SIGNAL_TO_ADVICE_KEY[signal]);
}

/** @deprecated Prefer `buildDynamicAdviceKeys` + `t()` in components */
export function buildDynamicAdvice(metrics: Metrics, responseTypes: StudentResponseType[]): string[] {
  return buildDynamicAdviceKeys(metrics, responseTypes);
}

// Legacy wrapper for backward compatibility
export function buildDynamicAdvice(
  metrics: Metrics,
  responseTypes: StudentResponseType[],
): string[] {
  return buildDynamicAdviceKeys(metrics, responseTypes);
}
