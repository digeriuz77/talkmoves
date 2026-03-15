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
      className="max-w-6xl w-full"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 bg-gradient-to-r from-amber-200 to-emerald-200 bg-clip-text text-transparent">
          Dialogic Classroom
        </h1>
        <p className="text-lg text-white/60">
          Practice realistic Primary classroom routines where pupils may think in Malay, answer in partial English, and still need help turning half-formed ideas into stronger talk.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 bg-blue-900/20 border border-blue-500/20 rounded-2xl p-6"
      >
        <div className="flex items-start gap-4">
          <BookOpen className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-white mb-2">About This Training Build</h3>
            <p className="text-sm text-white/60">
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
      className="group relative rounded-3xl border border-white/10 bg-neutral-800/50 p-7 text-left transition-all hover:border-white/25"
    >
      <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
        <Icon className="h-5 w-5 text-white/70" />
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
          {game.subtitle}
        </div>
        <div
          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
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
      <h2 className="mb-3 pr-10 text-2xl font-serif font-bold">{game.title}</h2>
      <p className="mb-5 text-sm leading-relaxed text-white/60">{game.description}</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {game.focusAreas.slice(0, 3).map((area) => (
          <span key={area} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
            {area}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 font-bold text-white/80">
        Start level <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>

      <div className="mt-6 border-t border-white/10 pt-4 text-xs text-white/40 space-y-1">
        <div>
          {isTalkMoves ? 'Chain responses • Talk-move combos' : 'Scenario choices • Visible classroom consequences'}
        </div>
        <div className="font-mono">
          Best score: {progress.bestScore}% • Attempts: {progress.attempts}
        </div>
      </div>
    </motion.button>
  );
}
