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

export default function EndScreen({ result, onRestart, onExit }: EndScreenProps) {
  const isWin = result.outcome === 'win';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`absolute inset-0 z-50 overflow-y-auto p-6 ${
        isWin ? 'bg-emerald-950' : 'bg-blue-950'
      }`}
    >
      <div className="mx-auto flex min-h-full max-w-4xl items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-black/45 p-8 text-center backdrop-blur-xl">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/10"
          >
            {result.variant === 'talk-moves' ? (
              isWin ? (
                <Sparkles className="h-12 w-12 text-amber-400" />
              ) : (
                <Lightbulb className="h-12 w-12 text-blue-300" />
              )
            ) : isWin ? (
              <Trophy className="h-12 w-12 text-emerald-300" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-blue-300" />
            )}
          </motion.div>

          <h1 className="text-4xl font-serif font-bold text-white">
            {isWin ? 'Discussion Opened Up' : 'Keep Rehearsing the Routine'}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-white/70">
            {isWin
              ? `You created a more dialogic version of "${result.title}" by widening participation and protecting student thinking, even before pupils could say everything cleanly in English.`
              : `This run shows how quickly discussion can collapse back into answer-hunting when time pressure and teacher anxiety take over. "${result.title}" is designed to be replayed so those trade-offs feel real.`}
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
            <Target className="h-4 w-4 text-amber-300" />
            Composite outcome
            <span className="font-mono text-white">{result.finalScore}%</span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {METRIC_ORDER.map((metric) => (
              <div key={metric} className="rounded-2xl bg-black/40 p-4 text-left">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">{metric}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{result.metrics[metric]}</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-white/70" style={{ width: `${result.metrics[metric]}%` }} />
                </div>
              </div>
            ))}
          </div>

          {result.variant === 'talk-moves' && (
            <>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <Target className="h-4 w-4 text-amber-300" />
                <span className="text-sm font-bold text-white">{result.profile.style}</span>
                <span className="text-xs text-white/50">Teaching Style</span>
              </div>

              <div className="mt-6 rounded-2xl bg-black/50 p-6 text-left">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-white/45">
                  Talk Move Profile
                </h3>
                <div className="space-y-3">
                  {Object.entries(result.profile.movesById)
                    .sort((left, right) => right[1] - left[1])
                    .map(([moveId, count]) => {
                      const move = talkMovesMap[moveId];
                      if (!move) {
                        return null;
                      }

                      return (
                        <div key={moveId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                move.category === 'terminal' ? 'bg-amber-300' : 'bg-white/40'
                              }`}
                            />
                            <span className="text-white/80">{move.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40">{move.category}</span>
                            <span className="rounded bg-emerald-400/10 px-2 py-0.5 font-mono text-emerald-300">
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

          <div className="mt-8 rounded-2xl bg-black/50 p-6 text-left">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              Move Pattern
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(result.historyCounts).length > 0 ? (
                Object.entries(result.historyCounts)
                  .sort((left, right) => right[1] - left[1])
                  .map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-white/80">{label}</span>
                      <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-white/65">×{count}</span>
                    </div>
                  ))
              ) : (
                <div className="text-white/40">No moves recorded.</div>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-blue-400/20 bg-blue-950/20 p-6 text-left">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-blue-200">
              Reflection Prompt
            </h3>
            <p className="text-sm leading-relaxed text-white/75">{result.reflectionPrompt}</p>

            {result.advice.length > 0 && (
              <div className="mt-4 space-y-2">
                {result.advice.map((advice) => (
                  <div key={advice} className="text-sm text-white/70">
                    • {advice}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={onRestart}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-black transition-colors hover:bg-white/90"
            >
              <RotateCcw className="h-5 w-5" />
              Try Again
            </button>
            <button
              onClick={onExit}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 font-bold text-white transition-colors hover:border-white/35 hover:bg-white/10"
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
