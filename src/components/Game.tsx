import { useMemo, useState } from 'react';
import Classroom from './Classroom';
import DialogueBox from './DialogueBox';
import EndScreen, { type ChoiceGameResult } from './EndScreen';
import GameSessionHeader from './GameSessionHeader';
import GameLangSegment from './GameLangSegment';
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
import { createReflectionSummary } from '../lib/reflection-summary';
import { resolveScenarioNode } from '../lib/scenario-variants';
import { buildDynamicAdviceKeys, type StudentResponseType } from '../lib/teacher-coaching';
import { useLang } from '../lib/i18n';

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

export default function Game({ assets, scenario, onExit, onComplete }: GameProps) {
  const { t, lang } = useLang();
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

  const speakerLabel = useMemo(() => {
    const id = currentNode.speakerId;
    if (!id) return undefined;
    return scenario.hotspots.find((h) => h.id === id)?.name ?? id;
  }, [currentNode.speakerId, scenario.hotspots]);

  const adviceKeys = useMemo(
    () => buildDynamicAdviceKeys(metrics, responseTypesSeen),
    [metrics, responseTypesSeen],
  );
  const adviceTranslated = useMemo(() => adviceKeys.map((key) => t(key)), [adviceKeys, t]);

  const result: ChoiceGameResult = useMemo(
    () => ({
      variant: 'choice',
      title: scenario.title,
      outcome: gameState === 'win' ? 'win' : 'loss',
      finalScore: engagementScore,
      passThreshold: scenario.passThreshold,
      metrics,
      reflectionPrompt: scenario.reflectionPrompt,
      historyCounts: summarizeLabels(moveHistory.map((entry) => entry.moveType)),
      advice: adviceTranslated,
      reflection: createReflectionSummary(
        {
          title: scenario.title,
          outcome: gameState === 'win' ? 'win' : 'loss',
          finalScore: engagementScore,
          passThreshold: scenario.passThreshold,
          metrics,
          responseTypes: responseTypesSeen,
          moveLabels: moveHistory.map((entry) => entry.moveType),
          supportLanguage: scenario.reflectionContext?.supportLanguage,
        },
        lang,
      ),
    }),
    [
      engagementScore,
      gameState,
      metrics,
      moveHistory,
      adviceTranslated,
      responseTypesSeen,
      scenario.passThreshold,
      scenario.reflectionContext,
      scenario.reflectionPrompt,
      scenario.title,
      lang,
    ],
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
    <div
      className="game-surface relative flex w-full max-w-[min(100%,92rem)] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      style={{ background: '#2c2520', minHeight: 'min(100dvh - 0.5rem, 960px)' }}
    >
      {gameState === 'playing' ? (
        <>
          <div className="min-h-0 flex-1 pt-[2.75rem] sm:pt-[3.25rem]">
            <Classroom
              engagementScore={engagementScore}
              lastDelta={lastDelta}
              hotspots={scenario.hotspots}
              spokenStudentIds={spokenStudents}
              assets={assets}
            />
          </div>

          <GameSessionHeader
            onExit={onExit}
            subtitle={scenario.subtitle}
            title={scenario.title}
            description={scenario.description}
            engagementScore={engagementScore}
            metrics={metrics}
            langSlot={<GameLangSegment />}
          />

          <DialogueBox
            node={currentNode}
            onChoice={handleChoice}
            feedback={feedback}
            onDismissFeedback={() => setFeedback(null)}
            speakerLabel={speakerLabel}
          />
        </>
      ) : (
        <EndScreen result={result} onRestart={handleRestart} onExit={onExit} />
      )}
    </div>
  );
}
