export const METRIC_KEYS = ['participation', 'reasoning', 'ownership'] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export type Metrics = Record<MetricKey, number>;

export type MetricDelta = Partial<Record<MetricKey, number>>;

const DEFAULT_METRIC_VALUE = 50;

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function createMetrics(partial?: Partial<Metrics>): Metrics {
  return {
    participation: clampScore(partial?.participation ?? DEFAULT_METRIC_VALUE),
    reasoning: clampScore(partial?.reasoning ?? DEFAULT_METRIC_VALUE),
    ownership: clampScore(partial?.ownership ?? DEFAULT_METRIC_VALUE),
  };
}

export function applyMetricDelta(metrics: Metrics, delta?: MetricDelta): Metrics {
  return {
    participation: clampScore(metrics.participation + (delta?.participation ?? 0)),
    reasoning: clampScore(metrics.reasoning + (delta?.reasoning ?? 0)),
    ownership: clampScore(metrics.ownership + (delta?.ownership ?? 0)),
  };
}

export function calculateCompositeScore(metrics: Metrics): number {
  const total = metrics.participation + metrics.reasoning + metrics.ownership;
  return Math.round(total / METRIC_KEYS.length);
}

export function isPassingScore(metrics: Metrics, threshold: number): boolean {
  return calculateCompositeScore(metrics) >= threshold;
}

export function summarizeLabels(labels: string[]): Record<string, number> {
  return labels.reduce<Record<string, number>>((summary, label) => {
    summary[label] = (summary[label] ?? 0) + 1;
    return summary;
  }, {});
}
