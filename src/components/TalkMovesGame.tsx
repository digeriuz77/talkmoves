// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Clock, HelpCircle, Lightbulb, X } from 'lucide-react';
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

const MAX_CHAIN_LENGTH = 3;

export default function TalkMovesGame({ scenario, onExit, onComplete }: TalkMovesGameProps) {
  const { t, lang } = useLang();
  const [currentNodeId, setCurrentNodeId] = useState<string>(scenario.startNodeId);
  const [metrics, setMetrics] = useState<Metrics>(createMetrics(scenario.startingMetrics));
  const [responseChain, setResponseChain] = useState<ChainItem[]>([]);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>('building');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showChainTip, setShowChainTip] = useState<boolean>(true);
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

  const availableMoves = currentNode?.availableMoves.map((id) => talkMovesMap[id]).filter(Boolean) || [];
  const engagementScore = calculateCompositeScore(metrics);
  const responseMeta = currentNode?.responseType ? getResponseTypeMeta(currentNode.responseType) : null;

  const canExecute = responseChain.some(
    (chainItem) => talkMovesMap[chainItem.moveId]?.category === 'terminal',
  );

  const addToChain = (moveId: string) => {
    if (gameState !== 'building') return;
    if (responseChain.length >= MAX_CHAIN_LENGTH) return;
    const move = talkMovesMap[moveId];
    if (!move) return;
    // Reserve the 3rd slot for a closing move so chains stay realistic (max 2 setup + 1 closer)
    if (responseChain.length === MAX_CHAIN_LENGTH - 1 && move.category !== 'terminal') return;
    if (responseChain.length > 0) {
      const lastInChain = talkMovesMap[responseChain[responseChain.length - 1].moveId];
      if (lastInChain?.category === 'terminal') return;
    }
    setResponseChain([...responseChain, { moveId, label: move.chainLabel }]);
    setFeedback(move.researchTip);
    setShowChainTip(false);
  };

  const removeFromChain = (index: number) => {
    if (gameState !== 'building') return;
    const newChain = [...responseChain];
    newChain.splice(index, 1);
    setResponseChain(newChain);
  };

  const executeChain = () => {
    if (!canExecute) return;
    const chainMoveIds = responseChain.map((c) => c.moveId);
    const turnScore = calculateChainScore(chainMoveIds);

    let comboText = '';
    for (let i = 1; i < chainMoveIds.length; i++) {
      const currentMove = talkMovesMap[chainMoveIds[i]];
      const prevMove = talkMovesMap[chainMoveIds[i - 1]];
      if (currentMove?.effectiveAfter.includes(prevMove?.id || '')) {
        comboText = t('talk.combo');
      }
    }

    const setupAvailable = availableMoves.some((m) => m.category === 'non-terminal');
    const chainMetrics = calculateChainMetrics(chainMoveIds);
    const chainAssessment = assessTalkMoveChain(chainMoveIds, previousTerminalMoveId, {
      setupAvailable,
    });
    const nextMetrics = applyMetricDelta(applyMetricDelta(metrics, chainMetrics), chainAssessment.adjustment);
    const newScore = calculateCompositeScore(nextMetrics);
    setMetrics(nextMetrics);

    setMoveHistory((prev) => [
      ...prev,
      ...chainMoveIds.map((moveId) => ({
        moveId,
        score: Math.floor((talkMovesMap[moveId]?.scoreValue || 0) / 10),
      })),
    ]);
    if (currentNode?.responseType) {
      setResponseTypesSeen((previous) => [...previous, currentNode.responseType as StudentResponseType]);
    }

    const feedbackText = comboText
      ? `${chainAssessment.feedback} ${comboText} +${turnScore} ${t('talk.pts')}`
      : `${chainAssessment.feedback} +${turnScore} ${t('talk.pts')}`;

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
    setShowHint(false);
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

  const profile: PedagogicalProfile = generateProfile(moveHistory.map((m) => m.moveId));

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
        moveHistory
          .map((entry) => talkMovesMap[entry.moveId]?.name)
          .filter((name): name is string => Boolean(name)),
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

  const chainScorePreview =
    responseChain.length > 0 ? calculateChainScore(responseChain.map((c) => c.moveId)) : 0;

  const turnIndex = Object.keys(scenario.nodes).indexOf(currentNodeId) + 1;
  const turnTotal = Object.keys(scenario.nodes).length;

  return (
    <div className="game-surface relative flex min-h-[100dvh] w-full max-w-[min(100%,88rem)] flex-col overflow-hidden bg-[#272220] sm:min-h-[min(100dvh-1rem,920px)] sm:rounded-3xl sm:border-2 sm:border-white/12 sm:shadow-2xl">
      {gameState === 'building' || gameState === 'reviewingTurn' ? (
        <>
          <GameSessionHeader
            onExit={onExit}
            subtitle={scenario.subtitle}
            title={scenario.title}
            description={scenario.description}
            engagementScore={engagementScore}
            metrics={metrics}
            turnLabel={`${turnIndex}/${turnTotal}`}
          />

          {/* Single unified scroll surface (no 3-box nested scroll traps) */}
          <div className="flex-1 overflow-y-auto px-3 py-3.5 sm:px-5 sm:py-4">
            <div className="mx-auto max-w-4xl space-y-3.5">
              {/* 1. Student Turn Bubble */}
              <motion.section
                key={currentNode?.studentText}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                aria-label={t('talk.studentTurn')}
                className="rounded-2xl border-2 border-white/15 bg-[#332c28] p-4 shadow-md"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-terracotta px-3 py-0.5 font-display text-xs font-bold text-white">
                      {currentNode?.studentName}
                    </span>
                    {responseMeta ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/35 bg-sky-500/15 px-2.5 py-0.5 font-display text-xs font-semibold text-sky-100">
                        <Lightbulb className="h-3 w-3 text-sky-300" aria-hidden />
                        {t(responseMeta.labelKey)}
                      </span>
                    ) : null}
                  </div>
                  {currentNode?.hint ? (
                    <button
                      type="button"
                      onClick={() => setShowHint((h) => !h)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2.5 py-1 font-display text-xs font-semibold text-white/80 hover:bg-white/15"
                    >
                      <HelpCircle className="h-3.5 w-3.5 text-amber-300" />
                      {showHint ? t('hint.hide') : t('hint.pedagogical')}
                    </button>
                  ) : null}
                </div>

                <p className="text-base font-semibold leading-relaxed text-white sm:text-lg" style={{ wordBreak: 'break-word' }}>
                  {currentNode?.studentText}
                </p>

                {currentNode?.pressureCue ? (
                  <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/12 px-3 py-2 text-xs font-semibold text-amber-100">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                    <span>{currentNode.pressureCue}</span>
                  </div>
                ) : null}

                {showHint && currentNode?.hint ? (
                  <p className="mt-2.5 rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-100">
                    {currentNode.hint}
                  </p>
                ) : null}
              </motion.section>

              {/* 2. Quick Research Tip Strip (when a move is tapped) */}
              <AnimatePresence mode="wait">
                {feedback ? (
                  <div key={feedback.slice(0, 64)}>
                    <CoachingStrip message={feedback} onDismiss={() => setFeedback(null)} />
                  </div>
                ) : null}
              </AnimatePresence>

              {/* 3. Move Palette */}
              <section>
                {showChainTip && turnIndex === 1 ? (
                  <div className="mb-2.5 flex items-center justify-between gap-2 rounded-2xl border border-amber-400/35 bg-amber-500/12 px-3.5 py-2 text-xs font-semibold text-amber-100">
                    <span>{t('talk.chainHint')}</span>
                    <button
                      type="button"
                      onClick={() => setShowChainTip(false)}
                      aria-label={t('coaching.dismiss')}
                      className="rounded-full p-1 text-amber-200/80 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
                <div className="mb-2 flex items-center justify-between px-0.5">
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white/60">
                    {t('talk.tapToAdd')}
                  </h3>
                  <span className="font-display text-xs font-bold tabular-nums text-white/50">
                    {responseChain.length}/{MAX_CHAIN_LENGTH}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {availableMoves.map((move) => {
                    const isInChain = responseChain.some((c) => c.moveId === move.id);
                    const isTerminal = move.category === 'terminal';
                    const slotReservedForTerminal =
                      responseChain.length === MAX_CHAIN_LENGTH - 1 && !isTerminal;
                    const chainClosed =
                      canExecute || responseChain.length >= MAX_CHAIN_LENGTH;
                    const isDisabled =
                      isInChain ||
                      chainClosed ||
                      slotReservedForTerminal ||
                      gameState !== 'building';
                    return (
                      <motion.button
                        key={move.id}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => addToChain(move.id)}
                        disabled={isDisabled}
                        title={`${move.name}: ${move.purpose}`}
                        className={`rounded-2xl border-2 px-3 py-3 text-left transition touch-target ${
                          isDisabled
                            ? 'cursor-not-allowed border-white/8 bg-white/[0.03] text-white/30'
                            : isTerminal
                              ? 'border-amber-400/55 bg-amber-500/15 text-amber-100 shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:bg-amber-500/25'
                              : 'border-white/15 bg-white/[0.07] text-white shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:border-white/30 hover:bg-white/[0.12]'
                        }`}
                      >
                        <span className="block truncate font-display text-sm font-bold">
                          {move.shortName}
                        </span>
                        <span
                          className={`mt-0.5 block truncate text-[11px] font-bold ${
                            isDisabled
                              ? 'text-white/25'
                              : isTerminal
                                ? 'text-amber-300'
                                : 'text-[#9ce2be]'
                          }`}
                        >
                          {isTerminal ? t('talk.endChain') : `+ ${t('talk.add')}`}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>

          {/* 4. Sticky Bottom Chain Rail (compact chips + Execute CTA) */}
          <div className="shrink-0 border-t-2 border-white/12 bg-[#1e1916] px-3 pt-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.35)] pb-safe sm:px-5">
            <div className="mx-auto max-w-4xl space-y-2">
              {responseChain.length > 0 ? (
                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {responseChain.map((item, index) => {
                    const move = talkMovesMap[item.moveId];
                    const isTerminal = move?.category === 'terminal';
                    return (
                      <span
                        key={`${item.moveId}-${index}`}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 py-1 pl-3 pr-1.5 font-display text-xs font-bold ${
                          isTerminal
                            ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
                            : 'border-white/20 bg-white/10 text-white'
                        }`}
                      >
                        <span>
                          {index + 1}. {move?.shortName || item.label}
                        </span>
                        {gameState === 'building' ? (
                          <button
                            type="button"
                            onClick={() => removeFromChain(index)}
                            aria-label={`Remove ${item.label}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/25 text-white/80 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {responseChain.length === 0 ? (
                    <p className="truncate text-xs font-semibold text-white/55">{t('talk.addTerminal')}</p>
                  ) : !canExecute ? (
                    <p className="truncate text-xs font-bold text-amber-200">{t('talk.addTerminal')}</p>
                  ) : (
                    <span className="font-display text-sm font-bold tabular-nums text-[#9ce2be]">
                      ~{chainScorePreview} {t('talk.pts')}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!canExecute || gameState !== 'building'}
                  onClick={executeChain}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border-2 border-[#236e4e] bg-sage px-5 py-2.5 font-display text-sm font-bold text-white shadow-[0_3px_0_#1b573d] transition hover:bg-[#287855] disabled:cursor-not-allowed disabled:opacity-40 touch-target"
                >
                  {t('talk.execute')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Turn Review Bottom Sheet */}
          {gameState === 'reviewingTurn' && pendingTurnReview ? (
            <div
              className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="turn-summary-title"
            >
              <div className="max-h-[82dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-2 border-white/15 bg-[#231d19] px-5 pt-5 shadow-2xl pb-safe sm:rounded-3xl sm:pb-6">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 id="turn-summary-title" className="font-display text-lg font-bold text-white">
                    {t('talk.turnSummary')}
                  </h2>
                  <span className="score-badge text-xs">
                    {pendingTurnReview.snapshotScore}%
                  </span>
                </div>

                <p className="mb-4 rounded-2xl border border-sage/35 bg-sage/15 px-3.5 py-2.5 text-sm font-semibold text-white">
                  {pendingTurnReview.feedback}
                </p>

                <ol className="mb-4 space-y-2.5">
                  {pendingTurnReview.executedChain.map((item, index) => {
                    const move = talkMovesMap[item.moveId];
                    return (
                      <li key={`review-${item.moveId}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="font-display text-sm font-bold text-white">
                          {index + 1}. {item.label}
                        </p>
                        {move ? (
                          <p className="mt-1 text-xs leading-relaxed text-white/70">{move.purpose}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>

                <button
                  type="button"
                  onClick={confirmTurnReview}
                  className="btn-primary w-full text-center text-base touch-target"
                >
                  {t('talk.continue')}
                </button>
                <p className="mt-2 text-center text-xs text-white/45">{t('talk.continueHint')}</p>
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
