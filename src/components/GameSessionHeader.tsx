import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import type { Metrics } from '../lib/game-progress';
import { useLang } from '../lib/i18n';

const METRIC_LABELS: Array<{ key: keyof Metrics; labelKey: string }> = [
  { key: 'participation', labelKey: 'end.metricParticipation' },
  { key: 'reasoning', labelKey: 'end.metricReasoning' },
  { key: 'ownership', labelKey: 'end.metricOwnership' },
];

type GameSessionHeaderProps = {
  onExit: () => void;
  subtitle: string;
  title: string;
  description: string;
  engagementScore: number;
  metrics: Metrics;
  /** e.g. in-game English / Bahasa Melayu control */
  langSlot?: ReactNode;
  rightSlot?: ReactNode;
};

export default function GameSessionHeader({
  onExit,
  subtitle,
  title,
  description,
  engagementScore,
  metrics,
  langSlot,
  rightSlot,
}: GameSessionHeaderProps) {
  const { t } = useLang();

  return (
    <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-[#2c2520]/90 px-3 sm:px-4 py-2.5 sm:py-3 backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 sm:px-3 py-2 text-xs font-medium text-white/90 transition-colors touch-target hover:border-white/20 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline font-display font-semibold" style={{ fontVariationSettings: "'SOFT' 100" }}>
            {t('header.levels')}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[10px] sm:tracking-[0.18em] text-amber-200/60">
            {subtitle}
          </p>
          <p className="truncate font-display text-sm sm:text-base font-semibold text-white" style={{ fontVariationSettings: "'SOFT' 100" }}>
            {title}
          </p>
        </div>
        <details className="group relative shrink-0 block">
          <summary className="cursor-pointer list-none rounded-lg border border-white/10 bg-white/5 px-2.5 sm:px-3 py-2 text-[10px] sm:text-[11px] font-medium text-white/60 transition-colors hover:bg-white/10 [&::-webkit-details-marker]:hidden">
            {t('header.about')}
          </summary>
          <div className="absolute left-0 top-full z-50 mt-2 max-h-40 w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-white/10 bg-[#2c2520]/95 p-4 text-xs leading-relaxed text-white/70 shadow-lg backdrop-blur-md">
            {description}
          </div>
        </details>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 sm:gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 sm:px-3 py-2 [&::-webkit-details-marker]:hidden touch-target">
            <span className="font-mono text-xs sm:text-sm tabular-nums text-white">{engagementScore}%</span>
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-white/40">
              {t('header.outcomes')}
            </span>
          </summary>
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(13rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-[#2c2520]/95 p-4 shadow-lg backdrop-blur-md">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {t('header.classroomOutcomes')}
            </p>
            <div className="space-y-3">
              {METRIC_LABELS.map(({ key, labelKey }) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/45">
                    <span>{t(labelKey)}</span>
                    <span className="font-mono tabular-nums text-white/60">{metrics[key]}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      animate={{ width: `${metrics[key]}%` }}
                      className="h-full rounded-full"
                      style={{
                        background: key === 'participation'
                          ? '#e8a892'
                          : key === 'reasoning'
                            ? '#8aab8f'
                            : '#f0d48a',
                      }}
                      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
        {langSlot}
        {rightSlot}
      </div>
    </header>
  );
}
