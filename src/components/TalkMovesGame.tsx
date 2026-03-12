import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { AssetUrls } from './AssetLoader';
import DialogueBox from './DialogueBox';
import FeedbackBubble from './FeedbackBubble';
import EndScreen, { type TalkMovesGameResult } from './EndScreen';
import {
  talkMovesMap,
  talkMoveScenarios,
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

const METRIC_LABELS: Array<keyof Metrics> = ['participation', 'reasoning', 'ownership'];

export default function TalkMovesGame({ assets, scenario, onExit, onComplete }: TalkMovesGameProps) {
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
    
    // Show pedagogical tip on first use
    setFeedback(move.researchTip);
    setTimeout(() => setFeedback(null), 4000);
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

  return (
    <div className="w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden relative shadow-2xl border border-white/10 flex flex-col">
      {gameState === 'building' || gameState === 'executing' ? (
        <>
          {/* Header */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
            <div className="flex gap-3">
              <button
                onClick={onExit}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/30 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Levels
              </button>

              <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  {scenario.subtitle}
                </div>
                <div className="mt-1 text-lg font-semibold text-white">{scenario.title}</div>
                <div className="mt-1 text-xs text-white/55">{scenario.description}</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md min-w-[320px]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                    Classroom Outcomes
                  </div>
                  <div className="text-sm font-mono text-white/70">{engagementScore}%</div>
                </div>
                <div className="space-y-2">
                  {METRIC_LABELS.map((metricKey) => (
                    <div key={metricKey}>
                      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-white/45">
                        <span>{metricKey}</span>
                        <span className="font-mono text-white/60">{metrics[metricKey]}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          animate={{ width: `${metrics[metricKey]}%` }}
                          className="h-full bg-white/70"
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                <div className="text-xs font-bold uppercase tracking-wider text-white/60">Turn</div>
                <div className="text-sm font-mono text-white">
                  {Object.keys(scenario.nodes).indexOf(currentNodeId) + 1} / {Object.keys(scenario.nodes).length}
                </div>
              </div>
            </div>
          </div>

          {/* Student Dialogue Box */}
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-16 pb-6 px-8 z-10">
            <motion.div 
              key={currentNode?.studentText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              {/* Student name badge */}
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-blue-600/80 rounded-full text-xs font-bold text-white">
                  {currentNode?.studentName}
                </span>
                <span className="text-white/40 text-sm">says:</span>
              </div>
              
              <p className="text-xl md:text-2xl font-serif text-white/90 leading-relaxed mb-4">
                {currentNode?.studentText}
              </p>

              {currentNode?.pressureCue && (
                <div className="mb-4 inline-flex max-w-3xl rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-medium text-amber-100">
                  {currentNode.pressureCue}
                </div>
              )}

              {responseMeta && (
                <div className="mb-4 max-w-3xl rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-left">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/75">
                    Student Response Type
                  </div>
                  <div className="mt-1 text-sm font-semibold text-sky-50">{responseMeta.label}</div>
                  <div className="mt-1 text-sm text-sky-100/75">{responseMeta.coaching}</div>
                </div>
              )}

              {/* Hint button */}
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-xs text-white/40 hover:text-white/60 underline mb-4"
              >
                {showHint ? 'Hide hint' : 'Show pedagogical hint'}
              </button>
              
              {showHint && currentNode?.hint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-blue-900/30 border border-blue-500/30 rounded-lg px-4 py-2 mb-4"
                >
                  <span className="text-blue-300 text-sm">{currentNode.hint}</span>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Response Chain Display */}
          <AnimatePresence>
            {responseChain.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute bottom-48 left-8 right-8 z-30"
              >
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">
                      Response Chain
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/40">
                        ~{chainScorePreview} points
                      </span>
                      {canExecute && (
                        <button
                          onClick={executeChain}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-full text-sm font-bold text-white transition-colors"
                        >
                          Execute →
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Chain items */}
                  <div className="flex flex-wrap gap-2">
                    {responseChain.map((item, index) => {
                      const move = talkMovesMap[item.moveId];
                      const isTerminal = move?.category === 'terminal';
                      return (
                        <motion.div
                          key={`${item.moveId}-${index}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                            isTerminal 
                              ? 'bg-amber-600/30 border border-amber-500/50' 
                              : 'bg-white/10 border border-white/20'
                          }`}
                        >
                          <span className="text-sm text-white/90">{item.label}</span>
                          <button
                            onClick={() => removeFromChain(index)}
                            className="text-white/40 hover:text-white/80"
                          >
                            ×
                          </button>
                        </motion.div>
                      );
                    })}
                    
                    {/* Arrow indicator */}
                    {canExecute && (
                      <span className="text-emerald-400 text-lg animate-pulse ml-2">
                        →
                      </span>
                    )}
                  </div>

                  {!canExecute && (
                    <p className="text-xs text-white/40 mt-3">
                      Add a terminal move (highlighted) to complete your response
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Talk Moves Palette */}
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/95 to-transparent pt-32 pb-4 px-8 z-40">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-3">
                Talk Moves Palette
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {availableMoves.map((move) => {
                  const isInChain = responseChain.some(c => c.moveId === move.id);
                  const isTerminal = move.category === 'terminal';
                  
                  return (
                    <motion.button
                      key={move.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addToChain(move.id)}
                      disabled={isInChain}
                      className={`relative px-3 py-2 rounded-xl border text-left transition-all ${
                        isInChain
                          ? 'opacity-30 cursor-not-allowed'
                          : isTerminal
                            ? 'bg-amber-900/30 border-amber-500/50 hover:border-amber-400'
                            : 'bg-white/5 border-white/10 hover:border-white/40'
                      }`}
                    >
                      <div className="text-xs font-bold text-white/80 mb-0.5 truncate">
                        {move.shortName}
                      </div>
                      <div className="text-[10px] text-white/50 truncate">
                        {isTerminal ? 'Terminal' : 'Chain'}
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 border border-white/20 rounded-xl p-3 opacity-0 invisible hover:opacity-100 hover:visible transition-opacity z-50 shadow-xl">
                        <div className="text-sm font-bold text-white mb-1">{move.name}</div>
                        <div className="text-xs text-white/70 mb-2">{move.purpose}</div>
                        <div className="text-[10px] text-blue-300 italic">{move.researchTip}</div>
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <div className="text-[10px] text-white/50">Try after: {move.effectiveAfter.length > 0 ? move.effectiveAfter.map(id => talkMovesMap[id]?.shortName).join(', ') : 'Any'}</div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {feedback && <FeedbackBubble message={feedback} onClose={() => setFeedback(null)} />}
          </AnimatePresence>
        </>
      ) : (
        <EndScreen 
          result={result}
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
}
