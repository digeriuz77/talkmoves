import type { Lang } from './i18n';
import { translate } from './i18n';
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

const STRONGEST_PRIORITY: MetricKey[] = ['reasoning', 'participation', 'ownership'];
const WEAKEST_PRIORITY: MetricKey[] = ['reasoning', 'ownership', 'participation'];

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

function buildStrengthText(strongestMetric: MetricKey, lang: Lang): string {
  return translate(lang, `reflection.strength.${strongestMetric}`);
}

function buildRiskText(weakestMetric: MetricKey, lang: Lang): string {
  return translate(lang, `reflection.risk.${weakestMetric}`);
}

function buildNextStep(weakestMetric: MetricKey, moveLabels: string[], lang: Lang): string {
  const open = hasGoodMoveVariety(moveLabels);
  switch (weakestMetric) {
    case 'participation':
      return translate(
        lang,
        open ? 'reflection.next.participation.open' : 'reflection.next.participation.closed',
      );
    case 'reasoning':
      return translate(lang, 'reflection.next.reasoning');
    case 'ownership':
      return translate(lang, open ? 'reflection.next.ownership.open' : 'reflection.next.ownership.closed');
    default:
      return translate(lang, open ? 'reflection.next.default.open' : 'reflection.next.default.closed');
  }
}

function buildHeadline(
  strongestMetric: MetricKey,
  weakestMetric: MetricKey,
  outcome: 'win' | 'loss',
  finalScore: number,
  passThreshold: number,
  lang: Lang,
): string {
  if (outcome === 'win') {
    return translate(lang, `reflection.headline.win.${strongestMetric}`);
  }

  if (passThreshold - finalScore <= 4) {
    return translate(lang, 'reflection.headline.close');
  }

  return translate(lang, `reflection.headline.loss.${weakestMetric}`);
}

function buildSummary(
  title: string,
  outcome: 'win' | 'loss',
  finalScore: number,
  passThreshold: number,
  lang: Lang,
): string {
  if (outcome === 'win') {
    return translate(lang, 'reflection.summary.win', {
      title,
      score: String(finalScore),
    });
  }

  return translate(lang, 'reflection.summary.loss', {
    score: String(finalScore),
    goal: String(passThreshold),
    title,
  });
}

function buildEvidence(moveLabels: string[], strongestMetric: MetricKey, lang: Lang): string[] {
  const evidence: string[] = [];
  const topMoveLabel = getTopMoveLabel(moveLabels);

  if (topMoveLabel) {
    evidence.push(translate(lang, 'reflection.evidence.topMove', { move: topMoveLabel }));
  }

  evidence.push(
    translate(
      lang,
      hasGoodMoveVariety(moveLabels) ? 'reflection.evidence.variety.good' : 'reflection.evidence.variety.narrow',
    ),
  );

  evidence.push(translate(lang, `reflection.evidence.signal.${strongestMetric}`));

  return evidence;
}

export function createReflectionSummary(
  input: ReflectionSummaryInput,
  lang: Lang = 'en',
): ReflectionSummary {
  const { strongest, weakest } = getMetricExtremes(input.metrics);
  const signals = buildCoachingSignals(input.metrics, input.responseTypes);
  const languageSignalSeen = signals.includes('emergent-language-visible');

  return {
    headline: buildHeadline(
      strongest,
      weakest,
      input.outcome,
      input.finalScore,
      input.passThreshold,
      lang,
    ),
    summary: buildSummary(input.title, input.outcome, input.finalScore, input.passThreshold, lang),
    strength: buildStrengthText(strongest, lang),
    risk: buildRiskText(weakest, lang),
    nextStep: buildNextStep(weakest, input.moveLabels, lang),
    evidence: buildEvidence(input.moveLabels, strongest, lang),
    languageNote:
      languageSignalSeen && input.supportLanguage
        ? translate(lang, 'reflection.languageNote', { language: input.supportLanguage })
        : undefined,
  };
}
