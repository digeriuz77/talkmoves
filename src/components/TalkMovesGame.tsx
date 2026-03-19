import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssetUrls } from './AssetLoader';
import CoachingStrip from './CoachingStrip';
import EndScreen, { type TalkMovesGameResult } from './EndScreen';
import GameSessionHeader from './GameSessionHeader';
import {
  talkMovesMap,
  calculateChainScore,
  calculateChainMetrics,
  generateProfile,
  type TalkMoveScenarioDefinition,
  type PedagogicalProfile,
} from '../data/talk_moves';
import {
  applyMetricDelta,
  calculateCompositeScore,
  createMetrics,
  isPassingScore,
  summarizeLabels,
  type Metrics,
} from '../lib/game-progress';
import { resolveScenarioNode } from '../lib/scenario-variants';
import {
  buildDynamicAdvice,
  getResponseTypeMeta,
  type StudentResponseType,
} from '../lib/teacher-coaching';

type GameState = 'building' | 'executing' | 'win' | 'loss';

export type ChainItem = {
  moveId: string;
  label: string;
};

export type MoveHistoryItem = {
  moveId: string;
  score: number;
};

type TalkMovesGameProps = {
  assets?: AssetUrls;
  scenario: TalkMoveScenarioDefinition;
  onExit: () => void;
  onComplete: (result: { levelId: string; score: number; completed: boolean }) => void;
};

export default function TalkMovesGame({ scenario, onExit, onComplete }: TalkMovesGameProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string>(scenario.startNodeId);
  const [metrics, setMetrics] = useState<Metrics>(createMetrics(scenario.startingMetrics));
  const [responseChain, setResponseChain] = useState<ChainItem[]>([]);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>('building');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [playthroughSeed, setPlaythroughSeed] = useState<number>(0);
  const [responseTypesSeen, setResponseTypesSeen] = useState<StudentResponseType[]>([]);

  const currentNode = useMemo(() => {
    const node = scenario.nodes[currentNodeId];
    const resolved = resolveScenarioNode(
      {
        text: node.studentText,
        alternateTexts: node.alternateStudentTexts,
        pressureCue: node.pressureCue,
        alternatePressureCues: node.alternatePressureCues,
      },
      currentNodeId,
      playthroughSeed,
    );

    return {
      ...node,
      studentText: resolved.text,
      pressureCue: resolved.pressureCue,
    };
  }, [currentNodeId, playthroughSeed, scenario.nodes]);
  const availableMoves = currentNode?.availableMoves.map(id => talkMovesMap[id]).filter(Boolean) || [];
  const engagementScore = calculateCompositeScore(metrics);
  const responseMeta = currentNode?.responseType ? getResponseTypeMeta(currentNode.responseType) : null;

  // Calculate if we're ready to execute (has terminal move in chain)
  const canExecute = responseChain.some(
    chainItem => talkMovesMap[chainItem.moveId]?.category === 'terminal'
  );

  // Check if chain is complete (terminal was last added)
  const isChainComplete = responseChain.length > 0 && 
    talkMovesMap[responseChain[responseChain.length - 1].moveId]?.category === 'terminal';

  const addToChain = (moveId: string) => {
    const move = talkMovesMap[moveId];
    if (!move) return;

    // Don't add if already at terminal (need to execute first)
    if (responseChain.length > 0) {
      const lastInChain = talkMovesMap[responseChain[responseChain.length - 1].moveId];
      if (lastInChain?.category === 'terminal') {
        return; // Already have terminal, must execute
      }
    }

    // Add to chain
    setResponseChain([...responseChain, { moveId, label: move.chainLabel }]);
    
    setFeedback(move.researchTip);
  };

  const removeFromChain = (index: number) => {
    const newChain = [...responseChain];
    newChain.splice(index, 1);
    setResponseChain(newChain);
  };

  const executeChain = () => {
    if (!canExecute) return;

    // Calculate score for this turn's chain
    const chainMoveIds = responseChain.map(c => c.moveId);
    const turnScore = calculateChainScore(chainMoveIds);
    
    // Calculate combo bonus indicator
    let comboText = '';
    for (let i = 1; i < chainMoveIds.length; i++) {
      const currentMove = talkMovesMap[chainMoveIds[i]];
      const prevMove = talkMovesMap[chainMoveIds[i - 1]];
      if (currentMove?.effectiveAfter.includes(prevMove?.id || '')) {
        comboText = '✨ Combo!';
      }
    }

    // Update score
    const chainMetrics = calculateChainMetrics(chainMoveIds);
    const nextMetrics = applyMetricDelta(metrics, chainMetrics);
    const newScore = calculateCompositeScore(nextMetrics);
    setMetrics(nextMetrics);

    // Record history
    chainMoveIds.forEach(moveId => {
      setMoveHistory(prev => [...prev, { 
        moveId, 
        score: Math.floor(talkMovesMap[moveId]?.scoreValue || 0 / 10) 
      }]);
    });
    if (currentNode?.responseType) {
      setResponseTypesSeen((previous) => [...previous, currentNode.responseType as StudentResponseType]);
    }

    // Show feedback
    if (comboText) {
      setFeedback(`Great chain! ${comboText} You earned ${turnScore} points!`);
    } else {
      setFeedback(`Response executed. You earned ${turnScore} points!`);
    }

    // Clear chain
    setResponseChain([]);

    // Move to next node
    const nodeKeys = Object.keys(scenario.nodes);
    const currentIndex = nodeKeys.indexOf(currentNodeId);
    const nextNode = nodeKeys[currentIndex + 1];

    if (nextNode) {
      setTimeout(() => {
        setCurrentNodeId(nextNode);
        setGameState('building');
        setFeedback(null);
      }, 1500);
    } else {
      // End of scenario
      setTimeout(() => {
        const completed = isPassingScore(nextMetrics, scenario.passThreshold);
        setGameState(completed ? 'win' : 'loss');
        onComplete({
          levelId: scenario.id,
          score: newScore,
          completed,
        });
      }, 1500);
    }
  };

  const handleRestart = () => {
    setCurrentNodeId(scenario.startNodeId);
    setMetrics(createMetrics(scenario.startingMetrics));
    setResponseChain([]);
    setMoveHistory([]);
    setFeedback(null);
    setGameState('building');
    setShowHint(false);
    setPlaythroughSeed((previous) => previous + 1);
    setResponseTypesSeen([]);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canExecute && gameState === 'building') {
        executeChain();
      }
      if (e.key === 'Escape') {
        setResponseChain([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canExecute, gameState, responseChain]);

  // Generate profile for end screen
  const profile: PedagogicalProfile = generateProfile(moveHistory.map(m => m.moveId));
  const result: TalkMovesGameResult = useMemo(
    () => ({
      variant: 'talk-moves',
      title: scenario.title,
      outcome: gameState === 'win' ? 'win' : 'loss',
      finalScore: engagementScore,
      metrics,
      reflectionPrompt: scenario.reflectionPrompt,
      historyCounts: summarizeLabels(
        moveHistory
          .map((entry) => talkMovesMap[entry.moveId]?.name)
          .filter((name): name is string => Boolean(name)),
      ),
      advice: [...buildDynamicAdvice(metrics, responseTypesSeen), ...profile.advice],
      profile,
    }),
    [engagementScore, gameState, metrics, moveHistory, profile, responseTypesSeen, scenario.reflectionPrompt, scenario.title],
  );

  // Current chain score preview
  const chainScorePreview = responseChain.length > 0
    ? calculateChainScore(responseChain.map(c => c.moveId))
    : 0;

  const turnIndex = Object.keys(scenario.nodes).indexOf(currentNodeId) + 1;
  const turnTotal = Object.keys(scenario.nodes).length;

  return (
    <div className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
      {gameState === 'building' || gameState === 'executing' ? (
        <>
          <GameSessionHeader
            onExit={onExit}
            subtitle={scenario.subtitle}
            title={scenario.title}
            description={scenario.description}
            engagementScore={engagementScore}
            metrics={metrics}
            rightSlot={
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm sm:text-base">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/45">Turn</div>
                <div className="font-mono text-xs sm:text-sm tabular-nums text-white">
                  {turnIndex}/{turnTotal}
                </div>
              </div>
            }
          />

          <div
            className="pointer-events-none absolute inset-x-0 top-11 bottom-0 bg-gradient-to-b from-slate-950/40 to-transparent"
            aria-hidden
          />

          <div className="absolute bottom-0 left-0 right-0 z-30 flex max-h-[58%] min-h-0 flex-col justify-end gap-2 overflow-y-auto border-t border-white/10 bg-gradient-to-t from-black via-black/98 to-black/85 px-3 pb-3 pt-2 sm:px-4">
            <AnimatePresence mode="wait">
              {feedback ? (
                <div key={feedback.slice(0, 64)} className="shrink-0">
                  <CoachingStrip
                    message={feedback}
                    onDismiss={() => setFeedback(null)}
                  />
                </div>
              ) : null}
            </AnimatePresence>

            <motion.div
              key={currentNode?.studentText}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="shrink-0 rounded-lg border border-white/10 bg-black/60 p-4"
            >
              <div className="mb-2">
                <span className="inline-block rounded-full bg-blue-600/90 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  {currentNode?.studentName}
                </span>
              </div>
              <p className="mb-3 font-serif text-base leading-relaxed text-white/90 sm:text-lg">
                {currentNode?.studentText}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                {currentNode?.pressureCue ? (
                  <div className="min-w-0 flex-1 rounded-lg border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-100/90">
                    <span className="font-semibold text-amber-200">Pressure · </span>
                    {currentNode.pressureCue}
                  </div>
                ) : null}
                {responseMeta ? (
                  <details className="min-w-0 flex-1 rounded-lg border border-sky-400/15 bg-sky-500/10 sm:max-w-[14rem]">
                    <summary className="cursor-pointer list-none px-3 py-2 [&::-webkit-details-marker]:hidden">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-200/75">
                        Response type
                      </span>
                      <span className="mt-0.5 block text-sm font-semibold text-sky-50">{responseMeta.label}</span>
                      <span className="text-[11px] text-sky-200/50 group-open:hidden">Open for tip</span>
                    </summary>
                    <p className="border-t border-sky-400/10 px-3 py-2 text-xs leading-relaxed text-sky-100/80">
                      {responseMeta.coaching}
                    </p>
                  </details>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="mt-2 text-[11px] text-white/45 underline hover:text-white/70"
              >
                {showHint ? 'Hide hint' : 'Pedagogical hint'}
              </button>
              {showHint && currentNode?.hint ? (
                <p className="mt-2 rounded-lg border border-blue-500/25 bg-blue-950/50 px-3 py-2 text-xs text-blue-200/90">
                  {currentNode.hint}
                </p>
              ) : null}
            </motion.div>

            {responseChain.length > 0 ? (
              <div className="shrink-0 rounded-lg border border-white/10 bg-black/75 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                    Your chain
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white/45">~{chainScorePreview} pts</span>
                    {canExecute ? (
                      <button
                        type="button"
                        onClick={executeChain}
                        className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
                      >
                        Execute →
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {responseChain.map((item, index) => {
                    const move = talkMovesMap[item.moveId];
                    const isTerminal = move?.category === 'terminal';
                    return (
                      <span
                        key={`${item.moveId}-${index}`}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                          isTerminal
                            ? 'border-amber-500/45 bg-amber-600/25 text-amber-100'
                            : 'border-white/15 bg-white/10 text-white/85'
                        }`}
                      >
                        {item.label}
                        <button
                          type="button"
                          onClick={() => removeFromChain(index)}
                          className="text-white/45 hover:text-white"
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                  {canExecute ? <span className="self-center text-emerald-400">→</span> : null}
                </div>
                {!canExecute ? (
                  <p className="mt-2 text-[11px] text-white/40">
                    Add a terminal move (amber) to run the chain.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="shrink-0 rounded-t-lg border border-white/10 border-b-0 bg-neutral-950/90 px-4 pb-4 pt-3">
              <h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                Talk moves — tap to add
              </h3>
              <div className="grid max-h-[7.5rem] grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-4 lg:grid-cols-7">
                {availableMoves.map((move) => {
                  const isInChain = responseChain.some((c) => c.moveId === move.id);
                  const isTerminal = move.category === 'terminal';
                  return (
                    <motion.button
                      key={move.id}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => addToChain(move.id)}
                      disabled={isInChain}
                      title={`${move.name}: ${move.purpose}`}
                      className={`rounded-lg border px-2 py-1.5 text-left text-[11px] transition-colors ${
                        isInChain
                          ? 'cursor-not-allowed border-white/5 bg-white/[0.03] text-white/25'
                          : isTerminal
                            ? 'border-amber-500/40 bg-amber-900/20 text-amber-100 hover:border-amber-400/60'
                            : 'border-white/10 bg-white/5 text-white/85 hover:border-white/30'
                      }`}
                    >
                      <span className="block truncate font-bold">{move.shortName}</span>
                      <span className="block truncate text-[9px] text-white/45">
                        {isTerminal ? 'End chain' : 'Add'}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <EndScreen result={result} onRestart={handleRestart} onExit={onExit} />
      )}
    </div>
  );
}
