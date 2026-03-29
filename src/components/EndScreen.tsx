import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
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
  participation: '#e8a892',
  reasoning: '#8aab8f',
  ownership: '#f0d48a',
};

export default function EndScreen({ result, onRestart, onExit }: EndScreenProps) {
  const { t } = useLang();
  const isWin = result.outcome === 'win';

  const description = isWin
    ? t('end.winDescription', { title: result.title })
    : t('end.lossDescription', { title: result.title });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-50 overflow-y-auto"
      style={{
        background: isWin
          ? 'linear-gradient(180deg, #1a2e1c 0%, #2c2520 50%, #1a2e1c 100%)'
          : 'linear-gradient(180deg, #2d3a4a 0%, #2c2520 50%, #2d3a4a 100%)',
      }}
    >
      <div className="mx-auto flex min-h-full max-w-4xl items-center justify-center p-4 sm:p-6">
        <div
          className="w-full rounded-xl sm:rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8 text-center backdrop-blur-sm sm:backdrop-blur-xl"
          style={{ background: 'rgba(44, 37, 32, 0.6)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mx-auto mb-4 sm:mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            {result.variant === 'talk-moves' ? (
              isWin ? (
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: '#d4952b' }} />
              ) : (
                <Lightbulb className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: '#8aab8f' }} />
              )
            ) : isWin ? (
              <Trophy className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: '#8aab8f' }} />
            ) : (
              <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: '#8aab8f' }} />
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-bold text-white"
            style={{
              fontFamily: "'Fraunces', serif",
              fontVariationSettings: "'SOFT' 100, 'WONK' 1",
              fontSize: 'clamp(1.5rem, 1.2rem + 2vw, 2.25rem)',
              wordBreak: 'break-word',
            }}
          >
            {result.reflection.headline}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mx-auto mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed"
            style={{ color: 'rgba(245, 240, 232, 0.6)', wordBreak: 'break-word' }}
          >
            {result.reflection.summary}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-4 sm:mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(245,240,232,0.8)' }}
          >
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#d4952b' }} />
            {t('end.score')}
            <span className="font-mono font-bold text-white">{result.finalScore}%</span>
            <span style={{ color: 'rgba(245,240,232,0.35)' }}>|</span>
            {t('end.goal')}
            <span className="font-mono font-bold text-white">{result.passThreshold}%</span>
          </motion.div>

          <div className="mt-5 sm:mt-8 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
            {METRIC_ORDER.map((metric, i) => (
              <motion.div
                key={metric}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="rounded-lg sm:rounded-xl p-3 sm:p-4 text-left"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: 'rgba(245,240,232,0.4)' }}
                >
                  {t(METRIC_LABEL_KEYS[metric])}
                </div>
                <div
                  className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-semibold text-white"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {result.metrics[metric]}
                </div>
                <div
                  className="mt-2 sm:mt-3 h-1.5 overflow-hidden rounded-full"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.metrics[metric]}%` }}
                    transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                    className="h-full rounded-full"
                    style={{ background: METRIC_COLORS[metric] }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {result.variant === 'talk-moves' && (
            <>
              <div
                className="mt-5 sm:mt-8 inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#d4952b' }} />
                <span className="text-xs sm:text-sm font-bold text-white">{result.profile.style}</span>
                <span className="text-[10px] sm:text-xs" style={{ color: 'rgba(245,240,232,0.45)' }}>
                  {t('end.teachingStyle')}
                </span>
              </div>

              <div
                className="mt-4 sm:mt-6 rounded-lg sm:rounded-xl p-3 sm:p-5 text-left"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <h3
                  className="mb-3 sm:mb-4 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: 'rgba(245,240,232,0.4)' }}
                >
                  {t('end.talkMoveProfile')}
                </h3>
                <div className="space-y-2.5 sm:space-y-3">
                  {Object.entries(result.profile.movesById)
                    .sort((left, right) => right[1] - left[1])
                    .map(([moveId, count]) => {
                      const move = talkMovesMap[moveId];
                      if (!move) return null;
                      return (
                        <div key={moveId} className="flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                background: move.category === 'terminal' ? '#d4952b' : 'rgba(245,240,232,0.3)',
                              }}
                            />
                            <span className="truncate text-sm" style={{ color: 'rgba(245,240,232,0.8)' }}>
                              {move.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[10px] sm:text-xs" style={{ color: 'rgba(245,240,232,0.35)' }}>
                              {move.category}
                            </span>
                            <span
                              className="rounded px-1.5 sm:px-2 py-0.5 font-mono text-xs sm:text-sm"
                              style={{ background: 'rgba(107,143,113,0.1)', color: '#8aab8f' }}
                            >
                              &times;{count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          <div className="mt-5 sm:mt-8 grid grid-cols-1 gap-3 text-left md:grid-cols-3">
            <div className="rounded-lg sm:rounded-xl p-4" style={{ background: 'rgba(26, 46, 28, 0.35)' }}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(138,171,143,0.85)' }}>
                {t('end.whatWorked')}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed" style={{ color: 'rgba(245,240,232,0.82)' }}>
                {result.reflection.strength}
              </p>
            </div>
            <div className="rounded-lg sm:rounded-xl p-4" style={{ background: 'rgba(212, 149, 43, 0.12)' }}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(240, 212, 138, 0.9)' }}>
                {t('end.watchOut')}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed" style={{ color: 'rgba(245,240,232,0.82)' }}>
                {result.reflection.risk}
              </p>
            </div>
            <div className="rounded-lg sm:rounded-xl p-4" style={{ background: 'rgba(42, 100, 140, 0.12)' }}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(138, 171, 143, 0.95)' }}>
                {t('end.tryNext')}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed" style={{ color: 'rgba(245,240,232,0.82)' }}>
                {result.reflection.nextStep}
              </p>
            </div>
          </div>

          <div
            className="mt-5 sm:mt-8 rounded-lg sm:rounded-xl p-3 sm:p-5 text-left"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <h3
              className="mb-3 sm:mb-4 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'rgba(245,240,232,0.4)' }}
            >
              {t('end.replayEvidence')}
            </h3>
            <div className="space-y-2">
              {result.reflection.evidence.map((line) => (
                <div key={line} className="text-xs sm:text-sm" style={{ color: 'rgba(245,240,232,0.7)' }}>
                  &middot; {line}
                </div>
              ))}
            </div>
            {result.reflection.languageNote ? (
              <p
                className="mt-4 rounded-lg border px-3 py-3 text-xs sm:text-sm leading-relaxed"
                style={{
                  borderColor: 'rgba(138, 171, 143, 0.25)',
                  background: 'rgba(26, 46, 28, 0.25)',
                  color: 'rgba(220, 235, 222, 0.9)',
                }}
              >
                {result.reflection.languageNote}
              </p>
            ) : null}
          </div>

          <div
            className="mt-5 sm:mt-8 rounded-lg sm:rounded-xl p-3 sm:p-5 text-left"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <h3
              className="mb-3 sm:mb-4 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'rgba(245,240,232,0.4)' }}
            >
              {t('end.movePattern')}
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2">
              {Object.entries(result.historyCounts).length > 0 ? (
                Object.entries(result.historyCounts)
                  .sort((left, right) => right[1] - left[1])
                  .map(([label, count]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between border-b pb-2"
                      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <span className="text-sm" style={{ color: 'rgba(245,240,232,0.75)' }}>
                        {label}
                      </span>
                      <span
                        className="rounded px-1.5 sm:px-2 py-0.5 font-mono text-xs sm:text-sm"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,232,0.6)' }}
                      >
                        &times;{count}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-sm" style={{ color: 'rgba(245,240,232,0.35)' }}>
                  {t('end.noMoves')}
                </div>
              )}
            </div>
          </div>

          <div
            className="mt-5 sm:mt-8 rounded-lg sm:rounded-xl border p-3 sm:p-5 text-left"
            style={{ borderColor: 'rgba(42,100,140,0.2)', background: 'rgba(42,100,140,0.06)' }}
          >
            <h3
              className="mb-2 sm:mb-3 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: '#8aab8f' }}
            >
              {t('end.trainerDebrief')}
            </h3>
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: 'rgba(245,240,232,0.7)', wordBreak: 'break-word' }}
            >
              {result.reflectionPrompt}
            </p>
            {result.advice.length > 0 && (
              <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
                {result.advice.map((advice, i) => (
                  <div
                    key={i}
                    className="text-xs sm:text-sm"
                    style={{ color: 'rgba(245,240,232,0.65)', wordBreak: 'break-word' }}
                  >
                    &middot; {advice}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 sm:mt-8 flex flex-col justify-center gap-2.5 sm:gap-3 sm:flex-row">
            <button
              onClick={onRestart}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-6 sm:px-8 py-3.5 sm:py-4"
            >
              <RotateCcw className="h-5 w-5" />
              {t('end.tryAgain')}
            </button>
            <button
              onClick={onExit}
              className="btn-secondary inline-flex items-center justify-center gap-2 rounded-lg px-6 sm:px-8 py-3.5 sm:py-4"
              style={{ borderColor: 'rgba(245,240,232,0.2)', color: 'rgba(245,240,232,0.85)' }}
            >
              <ArrowLeft className="h-5 w-5" />
              {t('end.backToLevels')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
