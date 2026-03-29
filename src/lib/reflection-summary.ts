import type { MetricKey, Metrics } from './game-progress';
import { buildCoachingSignals, type StudentResponseType } from './teacher-coaching';

export type ReflectionSummary = {
  headline: string;
  summary: string;
  strength: string;
  risk: string;
  nextStep: string;
  evidence: string[];
  languageNote?: string;
};

type ReflectionSummaryInput = {
  title: string;
  outcome: 'win' | 'loss';
  finalScore: number;
  passThreshold: number;
  metrics: Metrics;
  responseTypes: StudentResponseType[];
  moveLabels: string[];
  supportLanguage?: string;
};

const SIMPLE_METRIC_NAMES: Record<MetricKey, string> = {
  participation: 'More pupils joined',
  reasoning: 'Ideas got stronger',
  ownership: 'Pupils carried more of the thinking',
};

const STRONGEST_PRIORITY: MetricKey[] = ['reasoning', 'participation', 'ownership'];
const WEAKEST_PRIORITY: MetricKey[] = ['reasoning', 'ownership', 'participation'];
const LOSS_HEADLINES: Record<MetricKey, string> = {
  participation: 'More pupils needed to join.',
  reasoning: 'Ideas needed more time.',
  ownership: 'Pupils needed more room to think.',
};

function pickMetricByPriority(
  metrics: Metrics,
  priority: MetricKey[],
  mode: 'max' | 'min',
  excluded?: MetricKey,
): MetricKey {
  const keys = priority.filter((metric) => metric !== excluded);
  const values = keys.map((metric) => metrics[metric]);
  const targetValue = mode === 'max' ? Math.max(...values) : Math.min(...values);

  return keys.find((metric) => metrics[metric] === targetValue) ?? priority[0];
}

function getMetricExtremes(metrics: Metrics): { strongest: MetricKey; weakest: MetricKey } {
  const strongest = pickMetricByPriority(metrics, STRONGEST_PRIORITY, 'max');
  const weakest = pickMetricByPriority(metrics, WEAKEST_PRIORITY, 'min', strongest);

  return { strongest, weakest };
}

function getTopMoveLabel(moveLabels: string[]): string | null {
  const counts = moveLabels.reduce<Record<string, number>>((summary, label) => {
    summary[label] = (summary[label] ?? 0) + 1;
    return summary;
  }, {});

  return (
    Object.entries(counts)
      .sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
  );
}

function hasGoodMoveVariety(moveLabels: string[]): boolean {
  return new Set(moveLabels).size >= 3;
}

function buildStrengthText(strongestMetric: MetricKey): string {
  switch (strongestMetric) {
    case 'participation':
      return 'You widened the talk and brought in more than one voice.';
    case 'reasoning':
      return 'You kept the class on the thinking by staying with "why" and "how", not just the answer.';
    case 'ownership':
      return 'You let pupils carry more of the explanation themselves.';
    default:
      return 'You kept the discussion moving.';
  }
}

function buildRiskText(weakestMetric: MetricKey): string {
  switch (weakestMetric) {
    case 'participation':
      return 'Too much of the talk stayed with a small number of pupils.';
    case 'reasoning':
      return 'The talk needed more "why" and "how" before the answer.';
    case 'ownership':
      return 'The teacher voice was still doing too much of the work.';
    default:
      return 'The discussion closed too quickly.';
  }
}

function buildNextStep(weakestMetric: MetricKey, moveLabels: string[]): string {
  switch (weakestMetric) {
    case 'participation':
      return hasGoodMoveVariety(moveLabels)
        ? 'Next run, use pair talk or invite one more pupil in before moving on.'
        : 'Next run, add one more participation move before you close the turn.';
    case 'reasoning':
      return 'Next run, ask one more "Why?" or "What makes you think that?" before moving on.';
    case 'ownership':
      return hasGoodMoveVariety(moveLabels)
        ? 'Next run, revoice briefly, then give the explanation back to the pupil.'
        : 'Next run, add one more pupil-owned move before you close the turn.';
    default:
      return hasGoodMoveVariety(moveLabels)
        ? 'Next run, stay with the pupil idea a little longer.'
        : 'Next run, add one more talk move before you close the turn.';
  }
}

function buildHeadline(
  strongestMetric: MetricKey,
  weakestMetric: MetricKey,
  outcome: 'win' | 'loss',
  finalScore: number,
  passThreshold: number,
): string {
  if (outcome === 'win') {
    return `${SIMPLE_METRIC_NAMES[strongestMetric]}.`;
  }

  if (passThreshold - finalScore <= 4) {
    return 'You were close.';
  }

  return LOSS_HEADLINES[weakestMetric];
}

function buildSummary(
  title: string,
  outcome: 'win' | 'loss',
  finalScore: number,
  passThreshold: number,
): string {
  if (outcome === 'win') {
    return `You reached the goal for "${title}" with a score of ${finalScore}%.`;
  }

  return `You got ${finalScore}%. The goal for "${title}" is ${passThreshold}%.`;
}

function buildEvidence(moveLabels: string[], strongestMetric: MetricKey): string[] {
  const evidence: string[] = [];
  const topMoveLabel = getTopMoveLabel(moveLabels);

  if (topMoveLabel) {
    evidence.push(`You used ${topMoveLabel} more than any other move.`);
  }

  evidence.push(
    hasGoodMoveVariety(moveLabels)
      ? 'You used a good mix of talk moves.'
      : 'You leaned on the same move pattern a lot.',
  );

  if (strongestMetric === 'participation') {
    evidence.push('The room opened up to more voices.');
  } else if (strongestMetric === 'reasoning') {
    evidence.push('Pupils had more space to explain their thinking.');
  } else {
    evidence.push('Pupils carried more of the explanation themselves.');
  }

  return evidence;
}

export function createReflectionSummary(input: ReflectionSummaryInput): ReflectionSummary {
  const { strongest, weakest } = getMetricExtremes(input.metrics);
  const signals = buildCoachingSignals(input.metrics, input.responseTypes);
  const languageSignalSeen = signals.includes('emergent-language-visible');

  return {
    headline: buildHeadline(strongest, weakest, input.outcome, input.finalScore, input.passThreshold),
    summary: buildSummary(input.title, input.outcome, input.finalScore, input.passThreshold),
    strength: buildStrengthText(strongest),
    risk: buildRiskText(weakest),
    nextStep: buildNextStep(weakest, input.moveLabels),
    evidence: buildEvidence(input.moveLabels, strongest),
    languageNote: languageSignalSeen && input.supportLanguage
      ? `When pupils start in ${input.supportLanguage} or partial English, keep the idea first. Then help them say it in simple English.`
      : undefined,
  };
}
