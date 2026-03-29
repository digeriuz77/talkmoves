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
import { createReflectionSummary } from '../lib/reflection-summary';
import { resolveScenarioNode } from '../lib/scenario-variants';
import { assessTalkMoveChain } from '../lib/talk-moves-balance';
import {
  getResponseTypeMeta,
  buildDynamicAdviceKeys,
  type StudentResponseType,
} from '../lib/teacher-coaching';
import { useLang } from '../lib/i18n';

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

    if (comboText) {
      setFeedback(`${chainAssessment.feedback} ${comboText} You earned ${turnScore} points!`);
    } else {
      setFeedback(`${chainAssessment.feedback} You earned ${turnScore} points!`);
    }
    setPreviousTerminalMoveId(chainAssessment.terminalMoveId);
    setResponseChain([]);

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
      setTimeout(() => {
        const completed = isPassingScore(nextMetrics, scenario.passThreshold);
        setGameState(completed ? 'win' : 'loss');
        onComplete({ levelId: scenario.id, score: newScore, completed });
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
    setPreviousTerminalMoveId(undefined);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canExecute && gameState === 'building') executeChain();
      if (e.key === 'Escape') setResponseChain([]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canExecute, gameState, responseChain]);

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
      className="game-surface relative flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      style={{ background: '#2c2520', minHeight: 'min(100dvh - 2rem, 800px)' }}
    >
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
              className="flex min-h-[10.5rem] max-h-[min(38dvh,20rem)] shrink-0 flex-col border-b border-white/10 bg-[#262019] px-3 py-3 sm:px-4 sm:py-3.5"
              aria-label={t('talk.studentTurn')}
            >
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
                    className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed text-white/90"
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
            </section>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-3 pt-2 sm:px-4">
              <AnimatePresence mode="wait">
                {feedback ? (
                  <div key={feedback.slice(0, 64)} className="shrink-0">
                    <CoachingStrip message={feedback} onDismiss={() => setFeedback(null)} />
                  </div>
                ) : null}
              </AnimatePresence>

              {responseChain.length > 0 ? (
                <div className="shrink-0 rounded-lg border border-white/10 p-3 sm:p-4" style={{ background: 'rgba(44,37,32,0.85)' }}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/45">{t('talk.chain')}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-white/40">
                        ~{chainScorePreview} {t('talk.pts')}
                      </span>
                      {canExecute ? (
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
                  <div className="flex flex-wrap gap-1.5">
                    {responseChain.map((item, index) => {
                      const move = talkMovesMap[item.moveId];
                      const isTerminal = move?.category === 'terminal';
                      return (
                        <span
                          key={`${item.moveId}-${index}`}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
                          style={{
                            borderColor: isTerminal ? 'rgba(212,149,43,0.4)' : 'rgba(255,255,255,0.12)',
                            background: isTerminal ? 'rgba(212,149,43,0.15)' : 'rgba(255,255,255,0.08)',
                            color: isTerminal ? '#f0d48a' : 'rgba(245,240,232,0.8)',
                          }}
                        >
                          {item.label}
                          <button
                            type="button"
                            onClick={() => removeFromChain(index)}
                            className="rounded p-1 text-white/40 touch-target hover:text-white/80"
                            aria-label="Remove"
                            style={{
                              minWidth: '28px',
                              minHeight: '28px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            &times;
                          </button>
                        </span>
                      );
                    })}
                    {canExecute ? <span className="self-center" style={{ color: '#8aab8f' }}>&rarr;</span> : null}
                  </div>
                  {!canExecute ? <p className="mt-2 text-[11px] text-white/35">{t('talk.addTerminal')}</p> : null}
                </div>
              ) : null}

              <div
                className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-[rgba(44,37,32,0.92)] px-3 py-2.5 sm:px-4 sm:py-3"
              >
                <h3 className="mb-2 shrink-0 px-0.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {t('talk.tapToAdd')}
                </h3>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <div className="grid grid-cols-2 gap-1.5 pb-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
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
                          className="rounded-lg border px-2 py-2 sm:py-1.5 text-left text-[11px] transition-all duration-200 touch-target"
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
                            className="block truncate text-[9px]"
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
        </>
      ) : (
        <EndScreen result={result} onRestart={handleRestart} onExit={onExit} />
      )}
    </div>
  );
}
