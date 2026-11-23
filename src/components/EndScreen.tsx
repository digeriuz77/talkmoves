// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { talkMovesMap, type PedagogicalProfile } from '../data/talk_moves';
import type { Metrics } from '../lib/game-progress';
import type { ReflectionSummary } from '../lib/reflection-summary';
import { useLang } from '../lib/i18n';

type EndResultBase = {
  title: string;
  outcome: 'win' | 'loss';
  finalScore: number;
  passThreshold: number;
  metrics: Metrics;
  reflectionPrompt: string;
  historyCounts: Record<string, number>;
  advice: string[];
  reflection: ReflectionSummary;
};

export type ChoiceGameResult = EndResultBase & {
  variant: 'choice';
};

export type TalkMovesGameResult = EndResultBase & {
  variant: 'talk-moves';
  profile: PedagogicalProfile;
};

type EndScreenResult = ChoiceGameResult | TalkMovesGameResult;

interface EndScreenProps {
  result: EndScreenResult;
  onRestart: () => void;
  onExit: () => void;
}

const METRIC_ORDER: Array<keyof Metrics> = ['participation', 'reasoning', 'ownership'];

const METRIC_LABEL_KEYS: Record<keyof Metrics, string> = {
  participation: 'end.metricParticipation',
  reasoning: 'end.metricReasoning',
  ownership: 'end.metricOwnership',
};

const METRIC_COLORS: Record<string, string> = {
  participation: '#eb7a58',
  reasoning: '#52a982',
  ownership: '#f0ad38',
};

export default function EndScreen({ result, onRestart, onExit }: EndScreenProps) {
  const { t } = useLang();
  const isWin = result.outcome === 'win';

  // Deduplicated move breakdown: use profile counts for talk-moves, historyCounts for choice
  const moveBreakdown: Array<{ label: string; count: number; isTerminal?: boolean }> =
    result.variant === 'talk-moves'
      ? Object.entries(result.profile.movesById)
          .sort((a, b) => b[1] - a[1])
          .map(([id, count]) => ({
            label: talkMovesMap[id]?.name ?? id,
            count,
            isTerminal: talkMovesMap[id]?.category === 'terminal',
          }))
      : Object.entries(result.historyCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([label, count]) => ({ label, count }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto px-3 py-5 sm:p-6 pb-safe"
      style={{
        background: isWin
          ? 'linear-gradient(180deg, #1b3627 0%, #272220 55%, #1b3627 100%)'
          : 'linear-gradient(180deg, #273647 0%, #272220 55%, #273647 100%)',
      }}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Hero Card */}
        <section className="rounded-3xl border-2 border-white/15 bg-[#231d19]/90 p-5 text-center shadow-xl sm:p-7">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-amber-300/40 bg-white/8">
            {result.variant === 'talk-moves' ? (
              isWin ? (
                <Sparkles className="h-8 w-8 text-[#f0ad38]" />
              ) : (
                <Lightbulb className="h-8 w-8 text-[#52a982]" />
              )
            ) : isWin ? (
              <Trophy className="h-8 w-8 text-[#f0ad38]" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-[#eb7a58]" />
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            {result.reflection.headline}
          </h1>
          <p className="mx-auto mt-1.5 max-w-xl text-sm text-white/75">{result.reflection.summary}</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="score-badge text-sm">
              <Target className="h-4 w-4 text-[#f0ad38]" />
              {t('end.score')} {result.finalScore}% · {t('end.goal')} {result.passThreshold}%
            </span>
            {result.variant === 'talk-moves' ? (
              <span className="rounded-full border-2 border-white/15 bg-white/10 px-3 py-1.5 font-display text-xs font-bold text-white">
                {result.profile.style}
              </span>
            ) : null}
          </div>

          {/* Compact 3-Metric Row */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-left sm:gap-3">
            {METRIC_ORDER.map((metric) => (
              <div key={metric} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="truncate text-[11px] font-extrabold text-white/60">
                  {t(METRIC_LABEL_KEYS[metric])}
                </p>
                <p className="mt-1 font-display text-lg font-bold tabular-nums text-white sm:text-xl">
                  {result.metrics[metric]}%
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${result.metrics[metric]}%`, background: METRIC_COLORS[metric] }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Primary Takeaway Trio */}
          <div className="mt-4 grid grid-cols-1 gap-2.5 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-sage/35 bg-sage/15 p-3.5">
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[#9ce2be]">
                {t('end.whatWorked')}
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/90">{result.reflection.strength}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/35 bg-amber-500/15 p-3.5">
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-amber-200">
                {t('end.watchOut')}
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/90">{result.reflection.risk}</p>
            </div>
            <div className="rounded-2xl border border-sky-400/35 bg-sky-500/15 p-3.5">
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-sky-200">
                {t('end.tryNext')}
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/90">{result.reflection.nextStep}</p>
            </div>
          </div>

          {/* Prominent CTAs above the fold */}
          <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={onRestart}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 touch-target sm:w-auto sm:px-7"
            >
              <RotateCcw className="h-4 w-4" />
              {t('end.tryAgain')}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/20 bg-white/8 px-6 py-3 font-display text-sm font-bold text-white transition hover:bg-white/15 touch-target sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('end.backToLevels')}
            </button>
          </div>
        </section>

        {/* Collapsible Full Debrief & Deduplicated Move Breakdown */}
        <details className="group rounded-3xl border-2 border-white/15 bg-[#231d19]/90 p-4 text-left text-white sm:p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-display text-base font-bold text-white [&::-webkit-details-marker]:hidden touch-target">
            <span>{t('end.fullDebrief')}</span>
            <ChevronDown className="h-5 w-5 text-white/60 transition-transform group-open:rotate-180" />
          </summary>

          <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
            {/* Replay Evidence */}
            <div>
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-white/55">
                {t('end.replayEvidence')}
              </h3>
              <ul className="space-y-1.5 text-sm text-white/80">
                {result.reflection.evidence.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
              {result.reflection.languageNote ? (
                <p className="mt-3 rounded-2xl border border-sage/35 bg-sage/15 px-3.5 py-2.5 text-xs font-semibold text-[#c5edd8]">
                  {result.reflection.languageNote}
                </p>
              ) : null}
            </div>

            {/* Unified Move Breakdown */}
            <div>
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-white/55">
                {result.variant === 'talk-moves' ? t('end.talkMoveProfile') : t('end.movePattern')}
              </h3>
              {moveBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {moveBreakdown.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white/90">
                        {item.isTerminal !== undefined ? (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: item.isTerminal ? '#f0ad38' : '#52a982' }}
                          />
                        ) : null}
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="ml-2 rounded-full bg-white/10 px-2.5 py-0.5 font-display text-xs font-bold tabular-nums text-amber-200">
                        ×{item.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/45">{t('end.noMoves')}</p>
              )}
            </div>

            {/* Trainer Debrief */}
            <div className="rounded-2xl border border-sky-400/25 bg-sky-500/10 p-4">
              <h3 className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-sky-200">
                {t('end.trainerDebrief')}
              </h3>
              <p className="text-sm leading-relaxed text-white/85">{result.reflectionPrompt}</p>
              {result.advice.length > 0 ? (
                <ul className="mt-3 space-y-1 text-xs text-white/75">
                  {result.advice.map((advice, i) => (
                    <li key={i}>· {advice}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </motion.div>
  );
}
