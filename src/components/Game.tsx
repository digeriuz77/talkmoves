import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import Classroom from './Classroom';
import DialogueBox from './DialogueBox';
import FeedbackBubble from './FeedbackBubble';
import EndScreen, { type ChoiceGameResult } from './EndScreen';
import type { AssetUrls } from './AssetLoader';
import type { ChoiceMove, ChoiceNode, ChoiceScenarioDefinition } from '../data/choice-scenarios';
import {
  applyMetricDelta,
  calculateCompositeScore,
  createMetrics,
  isPassingScore,
  summarizeLabels,
  type Metrics,
} from '../lib/game-progress';
import { resolveScenarioNode } from '../lib/scenario-variants';
import { buildDynamicAdvice, type StudentResponseType } from '../lib/teacher-coaching';

export type Move = ChoiceMove;
export type Node = ChoiceNode;

export type MoveHistoryItem = {
  moveType: string;
  metricsDelta: Partial<Metrics>;
};

type GameProps = {
  assets?: AssetUrls;
  scenario: ChoiceScenarioDefinition;
  onExit: () => void;
  onComplete: (result: { levelId: string; score: number; completed: boolean }) => void;
};

const METRIC_LABELS: Array<keyof Metrics> = ['participation', 'reasoning', 'ownership'];

export default function Game({ assets, scenario, onExit, onComplete }: GameProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string>(scenario.startNodeId);
  const [metrics, setMetrics] = useState<Metrics>(createMetrics(scenario.startingMetrics));
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [gameState, setGameState] = useState<'playing' | 'win' | 'loss'>('playing');
  const [spokenStudents, setSpokenStudents] = useState<string[]>([]);
  const [playthroughSeed, setPlaythroughSeed] = useState<number>(0);
  const [responseTypesSeen, setResponseTypesSeen] = useState<StudentResponseType[]>([]);

  const currentNode = useMemo(() => {
    const node = scenario.dialogueTree[currentNodeId];
    const resolved = resolveScenarioNode(node, currentNodeId, playthroughSeed);
    return {
      ...node,
      text: resolved.text,
      pressureCue: resolved.pressureCue,
    };
  }, [currentNodeId, playthroughSeed, scenario.dialogueTree]);
  const engagementScore = calculateCompositeScore(metrics);

  const result: ChoiceGameResult = useMemo(
    () => ({
      variant: 'choice',
      title: scenario.title,
      outcome: gameState === 'win' ? 'win' : 'loss',
      finalScore: engagementScore,
      metrics,
      reflectionPrompt: scenario.reflectionPrompt,
      historyCounts: summarizeLabels(moveHistory.map((entry) => entry.moveType)),
      advice: buildDynamicAdvice(metrics, responseTypesSeen),
    }),
    [engagementScore, gameState, metrics, moveHistory, responseTypesSeen, scenario.reflectionPrompt, scenario.title],
  );

  const handleChoice = (choice: ChoiceMove) => {
    const nextMetrics = applyMetricDelta(metrics, choice.metricsDelta);
    const nextScore = calculateCompositeScore(nextMetrics);
    setMetrics(nextMetrics);
    setLastDelta(nextScore - engagementScore);
    setMoveHistory((previous) => [
      ...previous,
      {
        moveType: choice.moveType,
        metricsDelta: choice.metricsDelta,
      },
    ]);
    if (currentNode?.responseType) {
      setResponseTypesSeen((previous) => [...previous, currentNode.responseType as StudentResponseType]);
    }

    if (currentNode?.speakerId) {
      setSpokenStudents((previous) =>
        previous.includes(currentNode.speakerId as string)
          ? previous
          : [...previous, currentNode.speakerId as string],
      );
    }

    setFeedback(choice.tip ?? null);

    if (choice.nextNode === 'end_game') {
      const completed = isPassingScore(nextMetrics, scenario.passThreshold);
      setGameState(completed ? 'win' : 'loss');
      onComplete({
        levelId: scenario.id,
        score: nextScore,
        completed,
      });
      return;
    }

    setCurrentNodeId(choice.nextNode);
  };

  const handleRestart = () => {
    setCurrentNodeId(scenario.startNodeId);
    setMetrics(createMetrics(scenario.startingMetrics));
    setMoveHistory([]);
    setFeedback(null);
    setLastDelta(0);
    setGameState('playing');
    setSpokenStudents([]);
    setPlaythroughSeed((previous) => previous + 1);
    setResponseTypesSeen([]);
  };

  return (
    <div className="w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden relative shadow-2xl border border-white/10 flex flex-col">
      {gameState === 'playing' ? (
        <>
          <Classroom
            engagementScore={engagementScore}
            lastDelta={lastDelta}
            hotspots={scenario.hotspots}
            spokenStudentIds={spokenStudents}
            assets={assets}
          />

          <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between gap-4">
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
          </div>

          <div className="absolute top-28 left-4 z-20 rounded-2xl border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Who Has Spoken
            </div>
            <div className="mt-2 flex gap-2">
              {scenario.hotspots.map((hotspot) => {
                const hasSpoken = spokenStudents.includes(hotspot.id);
                return (
                  <div
                    key={hotspot.id}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      hasSpoken
                        ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
                        : 'border-white/10 bg-white/5 text-white/45'
                    }`}
                  >
                    {hotspot.name}
                  </div>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {feedback && <FeedbackBubble message={feedback} onClose={() => setFeedback(null)} />}
          </AnimatePresence>

          <DialogueBox node={currentNode} onChoice={handleChoice} />
        </>
      ) : (
        <EndScreen result={result} onRestart={handleRestart} onExit={onExit} />
      )}
    </div>
  );
}
