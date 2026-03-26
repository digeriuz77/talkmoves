/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fragment, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Game from './components/Game';
import TalkMovesGame from './components/TalkMovesGame';
import Landing from './components/Landing';
import { DEFAULT_ASSETS } from './components/AssetLoader';
import { Sparkles, Layers, ArrowRight, BookOpen } from 'lucide-react';
import { gameCatalog, type GameCatalogEntry } from './data/game-catalog';
import {
  getLevelStatus,
  updateLevelProgress,
  type LevelProgressMap,
} from './lib/level-progress';

const LEVEL_PROGRESS_STORAGE_KEY = 'dialogic-classroom-progress-v1';

export default function App() {
  const [pastLanding, setPastLanding] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgressMap>({});
  const selectedGame = gameCatalog.find((game) => game.id === selectedGameId) ?? null;

  useEffect(() => {
    const stored = window.localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY);
    if (!stored) return;
    try {
      setLevelProgress(JSON.parse(stored) as LevelProgressMap);
    } catch {
      setLevelProgress({});
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY, JSON.stringify(levelProgress));
  }, [levelProgress]);

  const handleLevelComplete = (result: { levelId: string; score: number; completed: boolean }) => {
    setLevelProgress((current) => updateLevelProgress(current, result.levelId, result));
  };

  if (!pastLanding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment p-4 font-body text-ink">
        <Landing onEnter={() => setPastLanding(true)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment p-3 sm:p-4 font-body text-ink">
      {!selectedGame ? (
        <ModeSelect onSelect={setSelectedGameId} levelProgress={levelProgress} />
      ) : selectedGame.engine === 'choice' ? (
        <Game
          assets={DEFAULT_ASSETS}
          scenario={selectedGame.scenario}
          onExit={() => setSelectedGameId(null)}
          onComplete={handleLevelComplete}
        />
      ) : (
        <TalkMovesGame
          assets={DEFAULT_ASSETS}
          scenario={selectedGame.scenario}
          onExit={() => setSelectedGameId(null)}
          onComplete={handleLevelComplete}
        />
      )}
    </div>
  );
}

function ModeSelect({
  onSelect,
  levelProgress,
}: {
  onSelect: (gameId: string) => void;
  levelProgress: LevelProgressMap;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl px-4 sm:px-6"
    >
      {/* Header — editorial style */}
      <div className="text-center mb-6 sm:mb-10 md:mb-12">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          className="mx-auto mb-4 sm:mb-6 h-[3px] w-10 sm:w-12 rounded-full bg-terracotta"
        />

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="label-section mb-2 sm:mb-3"
        >
          Primary Classroom Practice
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="heading-editorial mb-1"
          style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1" }}
        >
          Dialogic Classroom
        </motion.h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
          className="rule-editorial mx-auto mt-4 sm:mt-5 mb-3 sm:mb-4 max-w-[220px] sm:max-w-xs"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-body mx-auto max-w-2xl"
        >
          Practice realistic Primary classroom routines where pupils may think in Malay, answer in partial English, and still need help turning half-formed ideas into stronger talk.
        </motion.p>
      </div>

      {/* Game cards — single column on phone, 2-col tablet, 3-col desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {gameCatalog.map((game, index) => (
          <Fragment key={game.id}>
            <GameCard
              game={game}
              index={index}
              onSelect={onSelect}
              progress={getLevelStatus(levelProgress, game.id)}
            />
          </Fragment>
        ))}
      </div>

      {/* Info Section — editorial aside */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 sm:mt-10 md:mt-12 rounded-2xl border border-navy/10 bg-navy-bg/40 p-4 sm:p-6 md:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-5">
          <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/10 sm:mb-0">
            <BookOpen className="h-5 w-5 text-navy" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold text-ink mb-2" style={{ fontVariationSettings: "'SOFT' 100" }}>
              About This Training Build
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Based on research by Edwards-Groves, Chapin, O'Connor, and Alexander.
              These levels are designed to help teachers rehearse dialogic routines that keep English available for reasoning, even when lesson time is tight and the temptation is to take the one fast correct answer.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GameCard({
  game,
  index,
  onSelect,
  progress,
}: {
  game: GameCatalogEntry;
  index: number;
  onSelect: (gameId: string) => void;
  progress: ReturnType<typeof getLevelStatus>;
}) {
  const isTalkMoves = game.engine === 'talk-moves';
  const Icon = isTalkMoves ? Sparkles : Layers;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + index * 0.06, duration: 0.4 }}
      onClick={() => onSelect(game.id)}
      className="group card-warm relative p-4 sm:p-5 md:p-6 text-left transition-shadow duration-300 touch-target"
    >
      {/* Icon */}
      <div className="absolute right-3 top-3 sm:right-4 sm:top-4 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-ink/5">
        <Icon className="h-4 w-4 text-ink-muted" />
      </div>

      {/* Subtitle + status */}
      <div className="mb-2 sm:mb-3 flex items-center justify-between gap-2">
        <div className="label-section">{game.subtitle}</div>
        <div
          className={
            progress.completed
              ? 'pill-sage'
              : progress.attempts > 0
                ? 'pill-amber'
                : 'pill-terracotta'
          }
        >
          {progress.statusLabel}
        </div>
      </div>

      {/* Title — fluid via .heading-editorial */}
      <h2
        className="heading-editorial mb-2 sm:mb-2.5"
        style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1" }}
      >
        {game.title}
      </h2>

      {/* Description */}
      <p className="mb-3 sm:mb-4 text-sm leading-relaxed text-ink-soft">{game.description}</p>

      {/* Focus areas */}
      <div className="mb-3 sm:mb-4 flex flex-wrap gap-1.5">
        {game.focusAreas.slice(0, 3).map((area) => (
          <span
            key={area}
            className="rounded-full border border-ink/8 bg-ink/[0.03] px-2 sm:px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-muted"
          >
            {area}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-1.5 text-sm font-bold text-terracotta">
        Start level
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>

      {/* Footer meta */}
      <div className="mt-3 sm:mt-4 border-t border-ink/[0.06] pt-2.5 sm:pt-3 text-[11px] text-ink-muted space-y-1">
        <div>
          {isTalkMoves ? 'Chain responses · Talk-move combos' : 'Scenario choices · Visible classroom consequences'}
        </div>
        <div className="font-mono text-[11px]">
          Best score: {progress.bestScore}% · Attempts: {progress.attempts}
        </div>
      </div>
    </motion.button>
  );
}
