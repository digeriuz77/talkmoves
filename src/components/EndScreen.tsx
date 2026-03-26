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

type EndResultBase = {
  title: string;
  outcome: 'win' | 'loss';
  finalScore: number;
  metrics: Metrics;
  reflectionPrompt: string;
  historyCounts: Record<string, number>;
  advice: string[];
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

const METRIC_COLORS: Record<string, string> = {
  participation: '#e8a892',
  reasoning: '#8aab8f',
  ownership: '#f0d48a',
};

export default function EndScreen({ result, onRestart, onExit }: EndScreenProps) {
  const isWin = result.outcome === 'win';

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
      <div className="mx-auto flex min-h-full max-w-4xl items-center justify-center p-6">
        <div className="w-full rounded-2xl border border-white/10 p-8 text-center backdrop-blur-xl" style={{ background: 'rgba(44, 37, 32, 0.6)' }}>
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            {result.variant === 'talk-moves' ? (
              isWin ? (
                <Sparkles className="h-10 w-10" style={{ color: '#d4952b' }} />
              ) : (
                <Lightbulb className="h-10 w-10" style={{ color: '#8aab8f' }} />
              )
            ) : isWin ? (
              <Trophy className="h-10 w-10" style={{ color: '#8aab8f' }} />
            ) : (
              <AlertTriangle className="h-10 w-10" style={{ color: '#8aab8f' }} />
            )}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold text-white"
            style={{ fontFamily: "'Fraunces', serif", fontVariationSettings: "'SOFT' 100, 'WONK' 1" }}
          >
            {isWin ? 'Discussion Opened Up' : 'Keep Rehearsing the Routine'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mx-auto mt-3 max-w-2xl text-sm sm:text-base leading-relaxed"
            style={{ color: 'rgba(245, 240, 232, 0.6)' }}
          >
            {isWin
              ? `You created a more dialogic version of "${result.title}" by widening participation and protecting student thinking, even before pupils could say everything cleanly in English.`
              : `This run shows how quickly discussion can collapse back into answer-hunting when time pressure and teacher anxiety take over. "${result.title}" is designed to be replayed so those trade-offs feel real.`}
          </motion.p>

          {/* Score badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(245,240,232,0.8)' }}
          >
            <Target className="h-4 w-4" style={{ color: '#d4952b' }} />
            Composite outcome
            <span className="font-mono font-bold text-white">{result.finalScore}%</span>
          </motion.div>

          {/* Metrics */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {METRIC_ORDER.map((metric, i) => (
              <motion.div
                key={metric}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="rounded-xl p-4 text-left"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(245,240,232,0.4)' }}>
                  {metric}
                </div>
                <div className="mt-2 text-2xl font-semibold text-white" style={{ fontFamily: "'Fraunces', serif" }}>
                  {result.metrics[metric]}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
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

          {/* Talk-moves profile */}
          {result.variant === 'talk-moves' && (
            <>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <Target className="h-4 w-4" style={{ color: '#d4952b' }} />
                <span className="text-sm font-bold text-white">{result.profile.style}</span>
                <span className="text-xs" style={{ color: 'rgba(245,240,232,0.45)' }}>Teaching Style</span>
              </div>

              <div className="mt-6 rounded-xl p-5 text-left" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(245,240,232,0.4)' }}>
                  Talk Move Profile
                </h3>
                <div className="space-y-3">
                  {Object.entries(result.profile.movesById)
                    .sort((left, right) => right[1] - left[1])
                    .map(([moveId, count]) => {
                      const move = talkMovesMap[moveId];
                      if (!move) return null;

                      return (
                        <div key={moveId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                background: move.category === 'terminal' ? '#d4952b' : 'rgba(245,240,232,0.3)',
                              }}
                            />
                            <span style={{ color: 'rgba(245,240,232,0.8)' }}>{move.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: 'rgba(245,240,232,0.35)' }}>{move.category}</span>
                            <span className="rounded px-2 py-0.5 font-mono text-sm" style={{ background: 'rgba(107,143,113,0.1)', color: '#8aab8f' }}>
                              ×{count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* Move Pattern */}
          <div className="mt-8 rounded-xl p-5 text-left" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(245,240,232,0.4)' }}>
              Move Pattern
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(result.historyCounts).length > 0 ? (
                Object.entries(result.historyCounts)
                  .sort((left, right) => right[1] - left[1])
                  .map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'rgba(245,240,232,0.75)' }}>{label}</span>
                      <span className="rounded px-2 py-0.5 font-mono text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,232,0.6)' }}>×{count}</span>
                    </div>
                  ))
              ) : (
                <div style={{ color: 'rgba(245,240,232,0.35)' }}>No moves recorded.</div>
              )}
            </div>
          </div>

          {/* Reflection */}
          <div className="mt-8 rounded-xl border p-5 text-left" style={{ borderColor: 'rgba(42,100,140,0.2)', background: 'rgba(42,100,140,0.06)' }}>
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#8aab8f' }}>
              Reflection Prompt
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,240,232,0.7)' }}>
              {result.reflectionPrompt}
            </p>

            {result.advice.length > 0 && (
              <div className="mt-4 space-y-2">
                {result.advice.map((advice) => (
                  <div key={advice} className="text-sm" style={{ color: 'rgba(245,240,232,0.65)' }}>
                    · {advice}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={onRestart}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4"
            >
              <RotateCcw className="h-5 w-5" />
              Try Again
            </button>
            <button
              onClick={onExit}
              className="btn-secondary inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-white"
              style={{ borderColor: 'rgba(245,240,232,0.2)', color: 'rgba(245,240,232,0.85)' }}
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Levels
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
