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
      <div className="flex min-h-screen items-center justify-center bg-neutral-900 p-4 font-sans text-white">
        <Landing onEnter={() => setPastLanding(true)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 p-4 font-sans text-white">
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl w-full px-4"
    >
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-3 bg-gradient-to-r from-amber-200 to-emerald-200 bg-clip-text text-transparent">
          Dialogic Classroom
        </h1>
        <p className="text-sm md:text-lg text-white/60">
          Practice realistic Primary classroom routines where pupils may think in Malay, answer in partial English, and still need help turning half-formed ideas into stronger talk.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <div className="sm:hidden space-y-4">
          {/* Mobile view: vertical stack */}
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
        
          <div className="hidden sm:block">
            {/* Desktop view: grid layout */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 gap-y-8">
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
          </div>
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 sm:mt-8 bg-blue-900/20 border border-blue-500/20 rounded-2xl p-4 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 flex-shrink-0 mt-2 sm:mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-white mb-2 sm:mb-3">About This Training Build</h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
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
      transition={{ delay: index * 0.04 }}
      onClick={() => onSelect(game.id)}
      className="group relative rounded-2xl border border-white/10 bg-neutral-800/50 p-4 sm:p-6 text-left transition-all hover:border-white/25 touch-target"
    >
      <div className="absolute right-2 top-2 sm:right-4 sm:top-4 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/5">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white/70" />
      </div>

      <div className="mb-2 sm:mb-3 flex items-center justify-between gap-2 sm:gap-3">
        <div className="text-xs sm:text-sm font-bold uppercase tracking-[0.18em] text-white/45">
          {game.subtitle}
        </div>
        <div
          className={`rounded-full px-2 sm:px-3 py-1 sm:px-2 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em] ${
            progress.completed
              ? 'bg-emerald-400/15 text-emerald-200'
              : progress.attempts > 0
                ? 'bg-amber-300/15 text-amber-100'
                : 'bg-white/10 text-white/50'
          }`}
        >
          {progress.statusLabel}
        </div>
      </div>
      <h2 className="mb-2 sm:mb-3 flex-1 pr-2 sm:pr-4 text-lg sm:text-xl font-serif font-bold">{game.title}</h2>
      <p className="mb-2 sm:mb-3 text-xs sm:text-sm leading-relaxed text-white/60">{game.description}</p>

      <div className="mb-2 sm:mb-3 flex flex-wrap gap-1 sm:gap-2">
        {game.focusAreas.slice(0, 3).map((area) => (
          <span key={area} className="rounded-full border border-white/10 bg-white/5 px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-white/45">
            {area}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 font-bold text-white/80 text-xs sm:text-sm">
        Start level <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
      </div>

      <div className="mt-2 sm:mt-4 border-t border-white/10 pt-2 sm:pt-4 text-xs sm:text-[9px] text-white/40 space-y-1 sm:space-y-2">
        <div className="flex-1">
          {isTalkMoves ? 'Chain responses • Talk-move combos' : 'Scenario choices • Visible classroom consequences'}
        </div>
        <div className="font-mono text-xs sm:text-sm">
          Best score: {progress.bestScore}% • Attempts: {progress.attempts}
        </div>
      </div>
    </motion.button>
  );
}
