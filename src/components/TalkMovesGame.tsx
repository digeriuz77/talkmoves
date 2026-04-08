import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
import { createReflectionSummary } from '../lib/reflection-summary';
import { resolveScenarioNode } from '../lib/scenario-variants';
import { assessTalkMoveChain } from '../lib/talk-moves-balance';
import {
  getResponseTypeMeta,
  buildDynamicAdviceKeys,
  type StudentResponseType,
} from '../lib/teacher-coaching';
import { useLang } from '../lib/i18n';
import GameLangSegment from './GameLangSegment';

type GameState = 'building' | 'reviewingTurn' | 'win' | 'loss';

type PendingTurnReview = {
  executedChain: ChainItem[];
  feedback: string;
  nextNodeId: string | null;
  snapshotScore: number;
  passCompleted: boolean;
};

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
  const { t, lang } = useLang();
  const [currentNodeId, setCurrentNodeId] = useState<string>(scenario.startNodeId);
  const [metrics, setMetrics] = useState<Metrics>(createMetrics(scenario.startingMetrics));
  const [responseChain, setResponseChain] = useState<ChainItem[]>([]);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>('building');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [playthroughSeed, setPlaythroughSeed] = useState<number>(0);
  const [responseTypesSeen, setResponseTypesSeen] = useState<StudentResponseType[]>([]);
  const [previousTerminalMoveId, setPreviousTerminalMoveId] = useState<string | undefined>(undefined);
  const [pendingTurnReview, setPendingTurnReview] = useState<PendingTurnReview | null>(null);
  const pendingTurnReviewRef = useRef<PendingTurnReview | null>(null);
  pendingTurnReviewRef.current = pendingTurnReview;

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

  const canExecute = responseChain.some(
    chainItem => talkMovesMap[chainItem.moveId]?.category === 'terminal'
  );

  const addToChain = (moveId: string) => {
    if (gameState !== 'building') return;
    const move = talkMovesMap[moveId];
    if (!move) return;
    if (responseChain.length > 0) {
      const lastInChain = talkMovesMap[responseChain[responseChain.length - 1].moveId];
      if (lastInChain?.category === 'terminal') return;
    }
    setResponseChain([...responseChain, { moveId, label: move.chainLabel }]);
    setFeedback(move.researchTip);
  };

  const removeFromChain = (index: number) => {
    if (gameState !== 'building') return;
    const newChain = [...responseChain];
    newChain.splice(index, 1);
    setResponseChain(newChain);
  };

  const executeChain = () => {
    if (!canExecute) return;
    const chainMoveIds = responseChain.map(c => c.moveId);
    const turnScore = calculateChainScore(chainMoveIds);

    let comboText = '';
    for (let i = 1; i < chainMoveIds.length; i++) {
      const currentMove = talkMovesMap[chainMoveIds[i]];
      const prevMove = talkMovesMap[chainMoveIds[i - 1]];
      if (currentMove?.effectiveAfter.includes(prevMove?.id || '')) {
        comboText = t('talk.combo');
      }
    }

    const chainMetrics = calculateChainMetrics(chainMoveIds);
    const chainAssessment = assessTalkMoveChain(chainMoveIds, previousTerminalMoveId);
    const nextMetrics = applyMetricDelta(applyMetricDelta(metrics, chainMetrics), chainAssessment.adjustment);
    const newScore = calculateCompositeScore(nextMetrics);
    setMetrics(nextMetrics);

    chainMoveIds.forEach(moveId => {
      setMoveHistory(prev => [...prev, {
        moveId,
        score: Math.floor(talkMovesMap[moveId]?.scoreValue || 0 / 10),
      }]);
    });
    if (currentNode?.responseType) {
      setResponseTypesSeen((previous) => [...previous, currentNode.responseType as StudentResponseType]);
    }

    const feedbackText = comboText
      ? `${chainAssessment.feedback} ${comboText} You earned ${turnScore} points!`
      : `${chainAssessment.feedback} You earned ${turnScore} points!`;

    setPreviousTerminalMoveId(chainAssessment.terminalMoveId);

    const nodeKeys = Object.keys(scenario.nodes);
    const currentIndex = nodeKeys.indexOf(currentNodeId);
    const nextNodeId = nodeKeys[currentIndex + 1] ?? null;
    const passCompleted =
      nextNodeId === null ? isPassingScore(nextMetrics, scenario.passThreshold) : false;

    setPendingTurnReview({
      executedChain: [...responseChain],
      feedback: feedbackText,
      nextNodeId,
      snapshotScore: newScore,
      passCompleted,
    });
    setResponseChain([]);
    setGameState('reviewingTurn');
  };

  const confirmTurnReview = useCallback(() => {
    const current = pendingTurnReviewRef.current;
    if (!current) return;
    pendingTurnReviewRef.current = null;
    setPendingTurnReview(null);
    setFeedback(null);
    if (current.nextNodeId) {
      setCurrentNodeId(current.nextNodeId);
      setGameState('building');
    } else {
      setGameState(current.passCompleted ? 'win' : 'loss');
      onComplete({
        levelId: scenario.id,
        score: current.snapshotScore,
        completed: current.passCompleted,
      });
    }
  }, [onComplete, scenario.id]);

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
    setPreviousTerminalMoveId(undefined);
    setPendingTurnReview(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'reviewingTurn' && pendingTurnReview && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        confirmTurnReview();
        return;
      }
      if (e.key === 'Enter' && canExecute && gameState === 'building') executeChain();
      if (e.key === 'Escape' && gameState === 'building') setResponseChain([]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canExecute, gameState, responseChain, pendingTurnReview, confirmTurnReview]);

  const profile: PedagogicalProfile = generateProfile(moveHistory.map(m => m.moveId));

  const coachingAdviceKeys = useMemo(
    () => buildDynamicAdviceKeys(metrics, responseTypesSeen),
    [metrics, responseTypesSeen],
  );
  const adviceTranslated = useMemo(
    () => [...coachingAdviceKeys.map((key) => t(key)), ...profile.advice],
    [coachingAdviceKeys, profile.advice, t],
  );

  const result: TalkMovesGameResult = useMemo(
    () => ({
      variant: 'talk-moves',
      title: scenario.title,
      outcome: gameState === 'win' ? 'win' : 'loss',
      finalScore: engagementScore,
      passThreshold: scenario.passThreshold,
      metrics,
      reflectionPrompt: scenario.reflectionPrompt,
      historyCounts: summarizeLabels(
        moveHistory.map((entry) => talkMovesMap[entry.moveId]?.name).filter((name): name is string => Boolean(name)),
      ),
      advice: adviceTranslated,
      reflection: createReflectionSummary(
        {
          title: scenario.title,
          outcome: gameState === 'win' ? 'win' : 'loss',
          finalScore: engagementScore,
          passThreshold: scenario.passThreshold,
          metrics,
          responseTypes: responseTypesSeen,
          moveLabels: moveHistory
            .map((entry) => talkMovesMap[entry.moveId]?.name)
            .filter((name): name is string => Boolean(name)),
          supportLanguage: scenario.reflectionContext?.supportLanguage,
        },
        lang,
      ),
      profile,
    }),
    [
      engagementScore,
      gameState,
      metrics,
      moveHistory,
      profile,
      adviceTranslated,
      responseTypesSeen,
      scenario.passThreshold,
      scenario.reflectionContext,
      scenario.reflectionPrompt,
      scenario.title,
      lang,
    ],
  );

  const chainScorePreview = responseChain.length > 0
    ? calculateChainScore(responseChain.map(c => c.moveId))
    : 0;

  const turnIndex = Object.keys(scenario.nodes).indexOf(currentNodeId) + 1;
  const turnTotal = Object.keys(scenario.nodes).length;

  return (
    <div
      className="game-surface relative flex w-full max-w-[min(100%,88rem)] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      style={{ background: '#2c2520', minHeight: 'min(100dvh - 0.5rem, 960px)' }}
    >
      {gameState === 'building' || gameState === 'reviewingTurn' ? (
        <>
          <GameSessionHeader
            onExit={onExit}
            subtitle={scenario.subtitle}
            title={scenario.title}
            description={scenario.description}
            engagementScore={engagementScore}
            metrics={metrics}
            langSlot={<GameLangSegment />}
            rightSlot={
              <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-center">
                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-200/50">{t('header.turn')}</div>
                <div className="font-mono text-xs sm:text-sm tabular-nums text-white">
                  {turnIndex}/{turnTotal}
                </div>
              </div>
            }
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[2.85rem] sm:pt-[3.25rem]">
            <section
              className="flex min-h-[9.5rem] max-h-[min(34dvh,17rem)] shrink-0 flex-col border-b border-white/10 bg-[#262019] px-3 py-3 sm:px-4 sm:py-3.5"
              aria-label={t('talk.studentTurn')}
            >
              <div className="mx-auto w-full max-w-5xl min-h-0 flex-1">
                <p className="mb-2 shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-200/55">
                  {t('talk.studentTurn')}
                </p>
                <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                <motion.div
                  key={currentNode?.studentText}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-white/10 p-3 sm:p-4"
                  style={{ background: 'rgba(44, 37, 32, 0.75)' }}
                >
                  <div className="mb-2">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-white"
                      style={{ background: '#c45c3c' }}
                    >
                      {currentNode?.studentName}
                    </span>
                  </div>
                  <p
                    className="mb-2 sm:mb-3 text-sm sm:text-[1.05rem] leading-relaxed text-white/95"
                    style={{ fontFamily: "'Lora', serif", wordBreak: 'break-word' }}
                  >
                    {currentNode?.studentText}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    {currentNode?.pressureCue ? (
                      <div
                        className="min-w-0 flex-1 rounded-lg border border-amber-400/15 px-3 py-2 text-xs leading-snug text-amber-100/90"
                        style={{ background: 'rgba(212,149,43,0.08)' }}
                      >
                        <span className="font-semibold" style={{ color: '#d4952b' }}>
                          {t('dialogue.timePressure')} &middot;{' '}
                        </span>
                        {currentNode.pressureCue}
                      </div>
                    ) : null}
                    {responseMeta ? (
                      <details
                        className="min-w-0 flex-1 rounded-lg border border-sky-400/10 sm:max-w-[14rem]"
                        style={{ background: 'rgba(42,100,140,0.06)' }}
                      >
                        <summary className="cursor-pointer list-none px-3 py-2 touch-target [&::-webkit-details-marker]:hidden">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300/60">
                            {t('dialogue.responseType')}
                          </span>
                          <span className="mt-0.5 block text-sm font-semibold text-sky-100">{t(responseMeta.labelKey)}</span>
                          <span className="text-[11px] text-sky-300/35 group-open:hidden">{t('hint.openTip')}</span>
                        </summary>
                        <p className="border-t border-sky-400/8 px-3 py-2 text-xs leading-relaxed text-sky-100/70">
                          {t(responseMeta.coachingKey)}
                        </p>
                      </details>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="mt-2 rounded px-2 py-1 text-[11px] text-white/40 underline touch-target hover:text-white/65"
                  >
                    {showHint ? t('hint.hide') : t('hint.pedagogical')}
                  </button>
                  {showHint && currentNode?.hint ? (
                    <p
                      className="mt-2 rounded-lg border border-white/10 px-3 py-2 text-xs leading-relaxed text-white/75"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      {currentNode.hint}
                    </p>
                  ) : null}
                </motion.div>
              </div>
              </div>
            </section>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-3 pt-2 sm:px-4">
              <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-2">
              <AnimatePresence mode="wait">
                {feedback ? (
                  <div key={feedback.slice(0, 64)} className="shrink-0">
                    <CoachingStrip message={feedback} onDismiss={() => setFeedback(null)} />
                  </div>
                ) : null}
              </AnimatePresence>

              {responseChain.length > 0 ? (
                <div className="flex max-h-[min(42dvh,19rem)] shrink-0 flex-col rounded-lg border border-white/10 p-3 sm:p-4" style={{ background: 'rgba(44,37,32,0.85)' }}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/45">{t('talk.chain')}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-white/40">
                        ~{chainScorePreview} {t('talk.pts')}
                      </span>
                      {canExecute && gameState === 'building' ? (
                        <button
                          type="button"
                          onClick={executeChain}
                          className="rounded-full px-3 py-1.5 text-xs font-bold text-white transition-colors touch-target"
                          style={{ background: '#6b8f71' }}
                        >
                          {t('talk.execute')} &rarr;
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                    {responseChain.map((item, index) => {
                      const move = talkMovesMap[item.moveId];
                      const isTerminal = move?.category === 'terminal';
                      return (
                        <li
                          key={`${item.moveId}-${index}`}
                          className="flex gap-2 rounded-lg border px-2.5 py-2 sm:px-3"
                          style={{
                            borderColor: isTerminal ? 'rgba(212,149,43,0.35)' : 'rgba(255,255,255,0.1)',
                            background: isTerminal ? 'rgba(212,149,43,0.08)' : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          <span className="mt-0.5 shrink-0 font-mono text-[11px] tabular-nums text-amber-200/75">
                            {index + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-snug text-white/95">{item.label}</p>
                            {move ? (
                              <>
                                <p className="mt-1 text-xs leading-snug text-white/60">
                                  <span className="font-bold text-white/40">{t('talk.movePurpose')}: </span>
                                  {move.purpose}
                                </p>
                                <p className="mt-1 text-xs leading-snug text-white/50">
                                  <span className="font-bold text-white/35">{t('talk.moveTip')}: </span>
                                  {move.researchTip}
                                </p>
                              </>
                            ) : null}
                          </div>
                          {gameState === 'building' ? (
                            <button
                              type="button"
                              onClick={() => removeFromChain(index)}
                              className="shrink-0 self-start rounded p-1.5 text-white/40 touch-target hover:text-white/80"
                              aria-label="Remove"
                            >
                              &times;
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                  {gameState === 'building' && !canExecute ? (
                    <p className="mt-2 shrink-0 text-[11px] text-white/35">{t('talk.addTerminal')}</p>
                  ) : null}
                </div>
              ) : null}

              <div
                className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-[rgba(44,37,32,0.92)] px-3 py-2.5 sm:px-4 sm:py-3"
              >
                <h3 className="mb-2 shrink-0 px-0.5 text-[11px] font-bold uppercase tracking-wider text-white/45">
                  {t('talk.tapToAdd')}
                </h3>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <div className="grid grid-cols-2 gap-2 pb-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                    {availableMoves.map((move) => {
                      const isInChain = responseChain.some((c) => c.moveId === move.id);
                      const isTerminal = move.category === 'terminal';
                      return (
                        <motion.button
                          key={move.id}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => addToChain(move.id)}
                          disabled={isInChain || gameState !== 'building'}
                          title={`${move.name}: ${move.purpose}`}
                          className="rounded-lg border px-2.5 py-2.5 text-left text-xs transition-all duration-200 touch-target"
                          style={{
                            cursor: isInChain ? 'not-allowed' : 'pointer',
                            borderColor: isInChain
                              ? 'rgba(255,255,255,0.04)'
                              : isTerminal
                                ? 'rgba(212,149,43,0.35)'
                                : 'rgba(255,255,255,0.08)',
                            background: isInChain
                              ? 'rgba(255,255,255,0.02)'
                              : isTerminal
                                ? 'rgba(212,149,43,0.1)'
                                : 'rgba(255,255,255,0.04)',
                            color: isInChain
                              ? 'rgba(255,255,255,0.2)'
                              : isTerminal
                                ? '#f0d48a'
                                : 'rgba(245,240,232,0.8)',
                          }}
                        >
                          <span className="block truncate font-bold">{move.shortName}</span>
                          <span
                            className="block truncate text-[10px]"
                            style={{ color: isInChain ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)' }}
                          >
                            {isTerminal ? t('talk.endChain') : t('talk.add')}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          {gameState === 'reviewingTurn' && pendingTurnReview ? (
            <div
              className="absolute inset-0 z-40 flex flex-col justify-end bg-black/45 backdrop-blur-[2px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="turn-summary-title"
            >
              <div
                className="max-h-[min(72dvh,560px)] overflow-y-auto rounded-t-2xl border-t border-x border-white/15 bg-[#1e1916] px-4 pb-5 pt-4 shadow-2xl sm:px-6 sm:pb-6 sm:pt-5"
                style={{ boxShadow: '0 -12px 40px rgba(0,0,0,0.45)' }}
              >
                <h2 id="turn-summary-title" className="mb-1 font-display text-base font-semibold text-white sm:text-lg" style={{ fontVariationSettings: "'SOFT' 100" }}>
                  {t('talk.turnSummary')}
                </h2>
                <p className="mb-4 font-mono text-xs tabular-nums text-amber-200/70">
                  {t('talk.scoreAfterTurn', { score: String(pendingTurnReview.snapshotScore) })}
                </p>
                <ol className="mb-4 space-y-3 border-b border-white/10 pb-4">
                  {pendingTurnReview.executedChain.map((item, index) => {
                    const move = talkMovesMap[item.moveId];
                    return (
                      <li key={`review-${item.moveId}-${index}`} className="flex gap-2">
                        <span className="mt-0.5 font-mono text-xs tabular-nums text-amber-200/65">{index + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white/95">{item.label}</p>
                          {move ? (
                            <>
                              <p className="mt-1 text-xs leading-relaxed text-white/55">{move.purpose}</p>
                              <p className="mt-1 text-xs leading-relaxed text-white/45 italic">{move.researchTip}</p>
                            </>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="mb-5 text-sm leading-relaxed text-white/85">{pendingTurnReview.feedback}</p>
                <button
                  type="button"
                  onClick={confirmTurnReview}
                  className="w-full rounded-xl border border-white/15 bg-[#6b8f71] py-3.5 text-center text-sm font-bold text-white shadow-md transition-colors touch-target hover:bg-[#5a7a60] sm:text-base"
                >
                  {t('talk.continue')}
                </button>
                <p className="mt-2 text-center text-[10px] text-white/35">{t('talk.continueHint')}</p>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <EndScreen result={result} onRestart={handleRestart} onExit={onExit} />
      )}
    </div>
  );
}
