/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, ChevronDown, Layers, Sparkles, Trophy } from 'lucide-react';
import AppShell from './components/AppShell';
import Game from './components/Game';
import TalkMovesGame from './components/TalkMovesGame';
import TalkMoveBuilder from './components/TalkMoveBuilder';
import LiveCoach from './components/LiveCoach';
import Primer from './components/Primer';
import Landing from './components/Landing';
import { DEFAULT_ASSETS } from './components/AssetLoader';
import { gameCatalog, type GameCatalogEntry } from './data/game-catalog';
import {
  getLevelStatus,
  updateLevelProgress,
  type LevelProgressMap,
} from './lib/level-progress';
import { useLang } from './lib/i18n';
import { useAppRoute } from './lib/router';
import { ClassContextProvider } from './lib/class-context';

const LEVEL_PROGRESS_STORAGE_KEY = 'dialogic-classroom-progress-v1';

export default function App() {
  const { route, navigate } = useAppRoute();
  const [levelProgress, setLevelProgress] = useState<LevelProgressMap>({});

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
    try {
      window.localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY, JSON.stringify(levelProgress));
    } catch {
      // storage unavailable
    }
  }, [levelProgress]);

  const handleLevelComplete = (result: { levelId: string; score: number; completed: boolean }) => {
    setLevelProgress((current) => updateLevelProgress(current, result.levelId, result));
  };

  const selectedGame =
    route.name === 'game' ? gameCatalog.find((game) => game.id === route.gameId) ?? null : null;

  useEffect(() => {
    if (route.name === 'game' && !selectedGame) {
      navigate({ name: 'play' }, { replace: true });
    }
  }, [navigate, route, selectedGame]);

  if (route.name === 'welcome') {
    return <Landing onEnter={() => navigate({ name: 'play' })} />;
  }

  if (route.name === 'game') {
    if (!selectedGame) {
      return null;
    }

    return (
      <div className="min-h-[100dvh] bg-ink font-body text-parchment-light sm:flex sm:items-center sm:justify-center sm:bg-parchment sm:p-2">
        {selectedGame.engine === 'choice' ? (
          <Game
            assets={DEFAULT_ASSETS}
            scenario={selectedGame.scenario}
            onExit={() => navigate({ name: 'play' })}
            onComplete={handleLevelComplete}
          />
        ) : (
          <TalkMovesGame
            assets={DEFAULT_ASSETS}
            scenario={selectedGame.scenario}
            onExit={() => navigate({ name: 'play' })}
            onComplete={handleLevelComplete}
          />
        )}
      </div>
    );
  }

  return (
    <ClassContextProvider>
      <AppShell route={route} onNavigate={navigate}>
        {route.name === 'live' ? (
          <LiveCoach />
        ) : route.name === 'primer' ? (
          <Primer />
        ) : route.name === 'plan' || route.name === 'lesson' ? (
          <TalkMoveBuilder
            subMode={route.name}
            onSubModeChange={(next) => navigate({ name: next })}
          />
        ) : (
          <ScenarioLibrary
            levelProgress={levelProgress}
            onSelect={(gameId) => navigate({ name: 'game', gameId })}
          />
        )}
      </AppShell>
    </ClassContextProvider>
  );
}

type EngineFilter = 'all' | 'choice' | 'talk-moves';

function ScenarioLibrary({
  onSelect,
  levelProgress,
}: {
  onSelect: (gameId: string) => void;
  levelProgress: LevelProgressMap;
}) {
  const { t } = useLang();
  const [filter, setFilter] = useState<EngineFilter>('all');

  const filteredCatalog = useMemo(() => {
    if (filter === 'all') return gameCatalog;
    return gameCatalog.filter((game) => game.engine === filter);
  }, [filter]);

  const completedCount = useMemo(
    () => gameCatalog.filter((g) => getLevelStatus(levelProgress, g.id).statusKey === 'completed').length,
    [levelProgress],
  );

  const filterButtons: Array<{ id: EngineFilter; label: string }> = [
    { id: 'all', label: t('filter.all') },
    { id: 'choice', label: t('filter.choice') },
    { id: 'talk-moves', label: t('filter.talkMoves') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Compact Banner + Progress Counter */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="label-section text-terracotta">{t('mode.tagline')}</p>
          <h1 className="heading-editorial mt-0.5">{t('mode.title')}</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-sage/35 bg-sage-bg px-3.5 py-1.5 font-display text-sm font-bold tabular-nums text-[#1f6b4a]">
          <Trophy className="h-4 w-4 text-sage" aria-hidden />
          {completedCount}/{gameCatalog.length}
        </div>
      </div>

      {/* Horizontal Filter Pills */}
      <div
        role="group"
        aria-label="Filter scenarios"
        className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5"
      >
        {filterButtons.map((btn) => {
          const active = filter === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(btn.id)}
              className={`min-h-[40px] shrink-0 rounded-full border-2 px-4 py-1.5 font-display text-sm font-semibold transition ${
                active
                  ? 'border-terracotta bg-terracotta text-white shadow-[0_2px_0_#a33a1b]'
                  : 'border-ink/12 bg-parchment-light text-ink-soft hover:border-ink/25'
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Streamlined Scenario Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {filteredCatalog.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onSelect={onSelect}
            progress={getLevelStatus(levelProgress, game.id)}
          />
        ))}
      </div>

      {/* Collapsible Research Note */}
      <details className="card-warm group p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden touch-target">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-bg text-navy">
              <BookOpen className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-display text-base font-semibold text-ink">
              {t('mode.aboutTitle')}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-ink-muted transition-transform group-open:rotate-180" />
        </summary>
        <p className="mt-3 border-t border-ink/10 pt-3 text-sm leading-relaxed text-ink-soft">
          {t('mode.aboutBody')}
        </p>
      </details>
    </motion.div>
  );
}

function GameCard({
  game,
  onSelect,
  progress,
}: {
  game: GameCatalogEntry;
  onSelect: (gameId: string) => void;
  progress: ReturnType<typeof getLevelStatus>;
}) {
  const { t, lang } = useLang();
  const isTalkMoves = game.engine === 'talk-moves';
  const Icon = isTalkMoves ? Sparkles : Layers;
  const title =
    game.engine === 'choice' && lang === 'ms' ? game.scenario.titleMs ?? game.title : game.title;
  const subtitle =
    game.engine === 'choice' && lang === 'ms'
      ? game.scenario.subtitleMs ?? game.subtitle
      : game.subtitle;
  const description =
    game.engine === 'choice' && lang === 'ms'
      ? game.scenario.descriptionMs ?? game.description
      : game.description;

  const statusPillClass =
    progress.statusKey === 'completed'
      ? 'pill-sage'
      : progress.statusKey === 'inProgress'
        ? 'pill-amber'
        : 'pill-terracotta';

  return (
    <button
      type="button"
      onClick={() => onSelect(game.id)}
      className="group card-warm card-warm-interactive flex flex-col justify-between p-4 text-left touch-target"
    >
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-muted">
            <Icon className={`h-3.5 w-3.5 ${isTalkMoves ? 'text-amber' : 'text-sky'}`} aria-hidden />
            <span className="truncate">{subtitle}</span>
          </span>
          <span className={statusPillClass}>{t(`status.${progress.statusKey}`)}</span>
        </div>

        <h2 className="card-title mb-1.5">{title}</h2>

        <p className="line-clamp-2 text-sm leading-snug text-ink-soft">{description}</p>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-ink/8 pt-3">
        <span className="font-display text-xs font-semibold tabular-nums text-ink-muted">
          {progress.attempts > 0
            ? `${progress.bestScore}% · ${progress.attempts}×`
            : isTalkMoves
              ? t('filter.talkMoves')
              : t('filter.choice')}
        </span>
        <span className="inline-flex items-center gap-1 font-display text-sm font-bold text-terracotta">
          {t('card.startLevel')}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}
