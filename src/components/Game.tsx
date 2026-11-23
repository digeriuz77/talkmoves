// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Info } from 'lucide-react';
import Classroom from './Classroom';
import DialogueBox from './DialogueBox';
import EndScreen, { type ChoiceGameResult } from './EndScreen';
import GameSessionHeader from './GameSessionHeader';
import { ChoiceTeacherGuideContent } from './ChoiceTeacherGuide';
import { StudentFaceBadge, type StudentMood } from './StudentAvatar';
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
import { resolveScenarioNode, shuffleChoices } from '../lib/scenario-variants';
import { buildDynamicAdviceKeys, type StudentResponseType } from '../lib/teacher-coaching';
import { useLang } from '../lib/i18n';

export type Move = ChoiceMove;
export type Node = ChoiceNode;

export type MoveHistoryItem = {
  moveType: string;
  metricsDelta: Partial<Metrics>;
};

type PendingChoiceReview = {
  moveType: string;
  tip: string;
  delta: number;
  nextNodeId: string;
  snapshotScore: number;
  completed: boolean;
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
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [gameState, setGameState] = useState<'playing' | 'reviewingTurn' | 'win' | 'loss'>('playing');
  const [spokenStudents, setSpokenStudents] = useState<string[]>([]);
  const [playthroughSeed, setPlaythroughSeed] = useState<number>(0);
  const [responseTypesSeen, setResponseTypesSeen] = useState<StudentResponseType[]>([]);
  const [pendingReview, setPendingReview] = useState<PendingChoiceReview | null>(null);
  const pendingReviewRef = useRef<PendingChoiceReview | null>(null);
  pendingReviewRef.current = pendingReview;

  const pickLocalized = <T,>(enValue: T, msValue?: T): T =>
    lang === 'ms' ? (msValue ?? enValue) : enValue;

  const localizedScenarioMeta = useMemo(
    () => ({
      title: pickLocalized(scenario.title, scenario.titleMs),
      subtitle: pickLocalized(scenario.subtitle, scenario.subtitleMs),
      description: pickLocalized(scenario.description, scenario.descriptionMs),
      reflectionPrompt: pickLocalized(scenario.reflectionPrompt, scenario.reflectionPromptMs),
    }),
    [
      lang,
      scenario.description,
      scenario.descriptionMs,
      scenario.reflectionPrompt,
      scenario.reflectionPromptMs,
      scenario.subtitle,
      scenario.subtitleMs,
      scenario.title,
      scenario.titleMs,
    ],
  );

  const currentNode = useMemo(() => {
    const node = scenario.dialogueTree[currentNodeId];
    const resolved = resolveScenarioNode(
      {
        text: pickLocalized(node.text, node.textMs),
        alternateTexts: pickLocalized(node.alternateTexts, node.alternateTextsMs),
        pressureCue: pickLocalized(node.pressureCue, node.pressureCueMs),
        alternatePressureCues: pickLocalized(
          node.alternatePressureCues,
          node.alternatePressureCuesMs,
        ),
      },
      currentNodeId,
      playthroughSeed,
    );
    const localizedChoices = node.choices.map((choice) => ({
      ...choice,
      text: pickLocalized(choice.text, choice.textMs),
      tip: pickLocalized(choice.tip, choice.tipMs),
    }));

    return {
      ...node,
      text: resolved.text,
      pressureCue: resolved.pressureCue,
      choices: shuffleChoices(localizedChoices, currentNodeId, playthroughSeed),
    };
  }, [currentNodeId, lang, playthroughSeed, scenario.dialogueTree]);

  const engagementScore = calculateCompositeScore(metrics);
  const mood: StudentMood =
    engagementScore >= 70 ? 'engaged' : engagementScore < 40 ? 'disengaged' : 'neutral';

  const speakerLabel = useMemo(() => {
    const id = currentNode.speakerId;
    if (!id) return undefined;
    return scenario.hotspots.find((h) => h.id === id)?.name ?? currentNode.speakerName ?? id;
  }, [currentNode.speakerId, currentNode.speakerName, scenario.hotspots]);

  const nodeKeys = useMemo(() => Object.keys(scenario.dialogueTree), [scenario.dialogueTree]);
  const turnIndex = Math.max(1, nodeKeys.indexOf(currentNodeId) + 1);
  const turnTotal = nodeKeys.length;

  const adviceKeys = useMemo(
    () => buildDynamicAdviceKeys(metrics, responseTypesSeen),
    [metrics, responseTypesSeen],
  );
  const adviceTranslated = useMemo(() => adviceKeys.map((key) => t(key)), [adviceKeys, t]);

  const result: ChoiceGameResult = useMemo(
    () => ({
      variant: 'choice',
      title: localizedScenarioMeta.title,
      outcome: gameState === 'win' ? 'win' : 'loss',
      finalScore: engagementScore,
      passThreshold: scenario.passThreshold,
      metrics,
      reflectionPrompt: localizedScenarioMeta.reflectionPrompt,
      historyCounts: summarizeLabels(moveHistory.map((entry) => entry.moveType)),
      advice: adviceTranslated,
      reflection: createReflectionSummary(
        {
          title: localizedScenarioMeta.title,
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
      localizedScenarioMeta.reflectionPrompt,
      localizedScenarioMeta.title,
      lang,
    ],
  );

  const handleChoice = (choice: ChoiceMove) => {
    if (gameState !== 'playing') return;
    const nextMetrics = applyMetricDelta(metrics, choice.metricsDelta);
    const nextScore = calculateCompositeScore(nextMetrics);
    const delta = nextScore - engagementScore;
    setMetrics(nextMetrics);
    setLastDelta(delta);
    setMoveHistory((previous) => [
      ...previous,
      {
        moveType: choice.moveType,
        metricsDelta: choice.metricsDelta,
      },
    ]);
    if (currentNode?.responseType) {
      setResponseTypesSeen((previous) => [
        ...previous,
        currentNode.responseType as StudentResponseType,
      ]);
    }
    if (currentNode?.speakerId) {
      setSpokenStudents((previous) =>
        previous.includes(currentNode.speakerId as string)
          ? previous
          : [...previous, currentNode.speakerId as string],
      );
    }

    const completed =
      choice.nextNode === 'end_game' ? isPassingScore(nextMetrics, scenario.passThreshold) : false;

    setPendingReview({
      moveType: choice.moveType,
      tip: choice.tip ?? '',
      delta,
      nextNodeId: choice.nextNode,
      snapshotScore: nextScore,
      completed,
    });
    setGameState('reviewingTurn');
  };

  const confirmReview = useCallback(() => {
    const current = pendingReviewRef.current;
    if (!current) return;
    pendingReviewRef.current = null;
    setPendingReview(null);

    if (current.nextNodeId === 'end_game') {
      setGameState(current.completed ? 'win' : 'loss');
      onComplete({
        levelId: scenario.id,
        score: current.snapshotScore,
        completed: current.completed,
      });
      return;
    }

    setCurrentNodeId(current.nextNodeId);
    setGameState('playing');
  }, [onComplete, scenario.id]);

  useEffect(() => {
    if (gameState !== 'reviewingTurn') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        confirmReview();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, confirmReview]);

  const handleRestart = () => {
    setCurrentNodeId(scenario.startNodeId);
    setMetrics(createMetrics(scenario.startingMetrics));
    setMoveHistory([]);
    setLastDelta(0);
    setPendingReview(null);
    setGameState('playing');
    setSpokenStudents([]);
    setPlaythroughSeed((previous) => previous + 1);
    setResponseTypesSeen([]);
  };

  const isPositiveDelta = (pendingReview?.delta ?? 0) >= 0;

  return (
    <div className="game-surface relative flex min-h-[100dvh] w-full max-w-[min(100%,88rem)] flex-col overflow-hidden bg-[#272220] sm:min-h-[min(100dvh-1rem,920px)] sm:rounded-3xl sm:border-2 sm:border-white/12 sm:shadow-2xl">
      {gameState === 'playing' || gameState === 'reviewingTurn' ? (
        <>
          <GameSessionHeader
            onExit={onExit}
            subtitle={localizedScenarioMeta.subtitle}
            title={localizedScenarioMeta.title}
            description={localizedScenarioMeta.description}
            engagementScore={engagementScore}
            metrics={metrics}
            turnLabel={`${turnIndex}/${turnTotal}`}
            guideContent={
              scenario.teacherGuide ? (
                <ChoiceTeacherGuideContent guide={scenario.teacherGuide} lang={lang} />
              ) : undefined
            }
          />

          {/* Compact mobile illustrated students strip (< sm) */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#201b18] px-3 py-2 sm:hidden">
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
              {scenario.hotspots.map((hotspot) => (
                <StudentFaceBadge
                  key={hotspot.id}
                  studentId={hotspot.id}
                  name={hotspot.name}
                  isSpeaking={currentNode.speakerId === hotspot.id}
                  hasSpoken={spokenStudents.includes(hotspot.id)}
                  mood={mood}
                />
              ))}
            </div>
            <span className="shrink-0 font-display text-xs font-bold tabular-nums text-white/70">
              {spokenStudents.length}/{scenario.hotspots.length}
            </span>
          </div>

          {/* Full illustrated classroom on sm+ screens */}
          <div className="hidden h-[min(30dvh,14.5rem)] shrink-0 border-b border-white/10 sm:block">
            <Classroom
              engagementScore={engagementScore}
              lastDelta={lastDelta}
              hotspots={scenario.hotspots}
              spokenStudentIds={spokenStudents}
              activeSpeakerId={currentNode.speakerId}
              assets={assets}
              focusMode
            />
          </div>

          <DialogueBox
            node={currentNode}
            onChoice={handleChoice}
            speakerLabel={speakerLabel}
            speakerId={currentNode.speakerId}
            disabled={gameState !== 'playing'}
            layout="panel"
          />

          {/* Turn Feedback Sheet (reveals move name & coaching tip after choosing, including final turn) */}
          {gameState === 'reviewingTurn' && pendingReview ? (
            <div
              className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="choice-review-title"
            >
              <div className="w-full max-w-md rounded-t-3xl border-2 border-white/15 bg-[#231d19] px-5 pt-5 text-white shadow-2xl pb-safe sm:rounded-3xl sm:pb-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isPositiveDelta ? (
                      <CheckCircle2 className="h-5 w-5 text-[#52a982]" />
                    ) : (
                      <Info className="h-5 w-5 text-amber-300" />
                    )}
                    <span className="text-xs font-extrabold uppercase tracking-wider text-white/60">
                      {t('choice.moveUsed')}
                    </span>
                  </div>
                  <span
                    className={`rounded-full border-2 px-3 py-0.5 font-display text-xs font-bold tabular-nums ${
                      isPositiveDelta
                        ? 'border-sage/50 bg-sage/20 text-[#9ce2be]'
                        : 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                    }`}
                  >
                    {pendingReview.delta >= 0 ? `+${pendingReview.delta}%` : `${pendingReview.delta}%`} ·{' '}
                    {pendingReview.snapshotScore}%
                  </span>
                </div>

                <h2 id="choice-review-title" className="font-display text-xl font-bold text-white">
                  {pendingReview.moveType}
                </h2>

                {pendingReview.tip ? (
                  <p className="mt-2.5 rounded-2xl border border-white/12 bg-white/6 px-3.5 py-3 text-sm font-semibold leading-relaxed text-white/90">
                    {pendingReview.tip}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={confirmReview}
                  className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 text-base touch-target"
                >
                  {pendingReview.nextNodeId === 'end_game'
                    ? t('choice.seeResults')
                    : t('choice.nextTurn')}
                  <ArrowRight className="h-4 w-4" />
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
