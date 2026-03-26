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

export function getResponseTypeMeta(type: StudentResponseType): ResponseTypeMeta {
  return RESPONSE_TYPE_META[type];
}

export function buildDynamicAdviceKeys(
  metrics: Metrics,
  responseTypes: StudentResponseType[],
): string[] {
  const advice: string[] = [];
  const counts = countResponseTypes(responseTypes);

  if (metrics.participation < 45) {
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

  return advice;
}

// Legacy wrapper for backward compatibility
export function buildDynamicAdvice(
  metrics: Metrics,
  responseTypes: StudentResponseType[],
): string[] {
  return buildDynamicAdviceKeys(metrics, responseTypes);
}
