// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import type { Metrics } from '../lib/game-progress';
import { useLang } from '../lib/i18n';
import GameLangSegment from './GameLangSegment';

const METRIC_LABELS: Array<{ key: keyof Metrics; labelKey: string; color: string }> = [
  { key: 'participation', labelKey: 'end.metricParticipation', color: '#eb7a58' },
  { key: 'reasoning', labelKey: 'end.metricReasoning', color: '#52a982' },
  { key: 'ownership', labelKey: 'end.metricOwnership', color: '#f0ad38' },
];

type GameSessionHeaderProps = {
  onExit: () => void;
  subtitle: string;
  title: string;
  description: string;
  engagementScore: number;
  metrics: Metrics;
  turnLabel?: string;
  guideContent?: ReactNode;
};

export default function GameSessionHeader({
  onExit,
  subtitle,
  title,
  description,
  engagementScore,
  metrics,
  turnLabel,
  guideContent,
}: GameSessionHeaderProps) {
  const { t } = useLang();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  return (
    <>
      <header className="z-20 flex shrink-0 items-center justify-between gap-2 border-b-2 border-white/12 bg-[#231d19] px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            aria-label={t('header.levels')}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-white/15 bg-white/8 px-2.5 py-2 font-display text-xs font-semibold text-white transition hover:bg-white/15 touch-target"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('header.levels')}</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-extrabold uppercase tracking-wider text-amber-300/80">
              {subtitle}
            </p>
            <p className="truncate font-display text-sm font-bold text-white sm:text-base">
              {title}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {turnLabel ? (
            <span className="rounded-full border-2 border-sky-400/40 bg-[#1a2936] px-2.5 py-1.5 font-display text-xs font-bold tabular-nums text-sky-100">
              {turnLabel}
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={`${t('header.outcomes')}: ${engagementScore}%`}
            className="score-badge text-xs sm:text-sm touch-target"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#f0ad38]" aria-hidden />
            <span>{engagementScore}%</span>
          </button>

          <div className="hidden md:block">
            <GameLangSegment />
          </div>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={t('header.tools')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-white/15 bg-white/8 px-2.5 py-2 font-display text-xs font-semibold text-white/90 transition hover:bg-white/15 touch-target"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">{t('header.tools')}</span>
          </button>
        </div>
      </header>

      {/* Single controlled mobile/desktop Tools & Outcomes Sheet */}
      {sheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('header.tools')}
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="max-h-[82dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-white/15 bg-[#231d19] p-5 text-white shadow-2xl pb-safe sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-white">{t('header.classroomOutcomes')}</h2>
                <span className="score-badge text-xs">{engagementScore}%</span>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label={t('primer.close')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/15 bg-white/10 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Outcomes Bars */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
              {METRIC_LABELS.map(({ key, labelKey, color }) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold text-white/80">
                    <span>{t(labelKey)}</span>
                    <span className="font-display tabular-nums text-white">{metrics[key]}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/12">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics[key]}%` }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                      transition={{ duration: 0.35 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Language Switcher */}
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-white/65">
                {t('lang.name')}
              </span>
              <GameLangSegment />
            </div>

            {/* Scenario About */}
            {description ? (
              <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-200">
                  {t('header.about')}
                </p>
                <p className="text-xs leading-relaxed text-white/80">{description}</p>
              </section>
            ) : null}

            {/* Optional Teacher Plan */}
            {guideContent ? (
              <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <p className="mb-2.5 font-display text-sm font-bold text-white">
                  {t('guide.title')}
                </p>
                {guideContent}
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
