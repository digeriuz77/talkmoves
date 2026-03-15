import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import type { Metrics } from '../lib/game-progress';

const METRIC_LABELS: Array<keyof Metrics> = ['participation', 'reasoning', 'ownership'];

type GameSessionHeaderProps = {
  onExit: () => void;
  subtitle: string;
  title: string;
  description: string;
  engagementScore: number;
  metrics: Metrics;
  rightSlot?: ReactNode;
};

export default function GameSessionHeader({
  onExit,
  subtitle,
  title,
  description,
  engagementScore,
  metrics,
  rightSlot,
}: GameSessionHeaderProps) {
  return (
    <header className="absolute left-0 right-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/75 px-3 py-2 backdrop-blur-md">
      <div className="flex min-w-0 max-w-[min(100%,28rem)] flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 transition-colors hover:border-white/30 hover:bg-white/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Levels
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            {subtitle}
          </p>
          <p className="truncate text-sm font-semibold text-white">{title}</p>
        </div>
        <details className="group relative shrink-0">
          <summary className="cursor-pointer list-none rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/55 transition-colors hover:bg-white/10 [&::-webkit-details-marker]:hidden">
            About
          </summary>
          <div className="absolute left-0 top-full z-50 mt-1 max-h-32 w-64 overflow-y-auto rounded-xl border border-white/10 bg-neutral-900/95 p-3 text-xs leading-relaxed text-white/65 shadow-xl backdrop-blur-md">
            {description}
          </div>
        </details>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-sm tabular-nums text-white">{engagementScore}%</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Outcomes
            </span>
          </summary>
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-white/10 bg-neutral-900/95 p-3 shadow-xl backdrop-blur-md">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Classroom outcomes
            </p>
            <div className="space-y-2">
              {METRIC_LABELS.map((metricKey) => (
                <div key={metricKey}>
                  <div className="mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/45">
                    <span>{metricKey}</span>
                    <span className="font-mono text-white/60">{metrics[metricKey]}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      animate={{ width: `${metrics[metricKey]}%` }}
                      className="h-full bg-white/70"
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
        {rightSlot}
      </div>
    </header>
  );
}
