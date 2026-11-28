/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Dices,
  FileSearch,
  Gamepad2,
  Layers,
  MessageSquareText,
  MessagesSquare,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import AppShell from './components/AppShell';
import Game from './components/Game';
import TalkMovesGame from './components/TalkMovesGame';
import TalkMoveBuilder from './components/TalkMoveBuilder';
import LiveCoach from './components/LiveCoach';
import Primer from './components/Primer';
import ConceptCartoonStudio from './components/ConceptCartoonStudio';
import Landing from './components/Landing';
import { DEFAULT_ASSETS } from './components/AssetLoader';
import { gameCatalog, type GameCatalogEntry } from './data/game-catalog';
import {
  getLevelStatus,
  updateLevelProgress,
  type LevelProgressMap,
} from './lib/level-progress';
import { useLang } from './lib/i18n';
import { useAppRoute, type AppRoute } from './lib/router';
import { ClassContextProvider } from './lib/class-context';
import { StrategyProvider } from './lib/strategy-context';
import type { LiveCoachHandoff } from './lib/coach-handoff';

const LEVEL_PROGRESS_STORAGE_KEY = 'dialogic-classroom-progress-v1';

export default function App() {
  const { route, navigate } = useAppRoute();
  const [levelProgress, setLevelProgress] = useState<LevelProgressMap>({});
  // One-shot hand-off into the Live Coach (e.g. a Concept Cartoon follow-up chip). Held in
  // memory only so nothing from the classroom is persisted.
  const [liveHandoff, setLiveHandoff] = useState<LiveCoachHandoff | null>(null);

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
    return <Landing onEnter={() => navigate({ name: 'home' })} />;
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
      <StrategyProvider>
        <AppShell route={route} onNavigate={navigate}>
          {route.name === 'home' ? (
            <HomeHub levelProgress={levelProgress} onNavigate={navigate} />
          ) : route.name === 'live' ? (
            <LiveCoach
              handoff={liveHandoff}
              onHandoffConsumed={() => setLiveHandoff(null)}
            />
          ) : route.name === 'primer' ? (
            <Primer onOpenStudio={() => navigate({ name: 'cartoon' })} />
          ) : route.name === 'cartoon' ? (
            <ConceptCartoonStudio
              onOpenLiveCoach={(handoff) => {
                setLiveHandoff(handoff);
                navigate({ name: 'live' });
              }}
            />
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
      </StrategyProvider>
    </ClassContextProvider>
  );
}

function HomeHub({
  levelProgress,
  onNavigate,
}: {
  levelProgress: LevelProgressMap;
  onNavigate: (next: AppRoute) => void;
}) {
  const { t } = useLang();
  const completedCount = useMemo(
    () => gameCatalog.filter((g) => getLevelStatus(levelProgress, g.id).statusKey === 'completed').length,
    [levelProgress],
  );

  const secondaryTools: Array<{
    id: string;
    title: string;
    body: string;
    icon: typeof Gamepad2;
    iconWrap: string;
    badge?: string;
    target: AppRoute;
  }> = [
    {
      id: 'primer',
      title: t('coach.tab.primer'),
      body: t('home.primerBody'),
      icon: Dices,
      iconWrap: 'bg-sage-bg text-[#1f6b4a] border-sage/35',
      target: { name: 'primer' },
    },
    {
      id: 'cartoon',
      title: t('studio.title'),
      body: t('home.studioBody'),
      icon: MessagesSquare,
      iconWrap: 'bg-amber-bg text-[#9e5f06] border-amber/45',
      target: { name: 'cartoon' },
    },
    {
      id: 'plan',
      title: t('coach.tab.plan'),
      body: t('home.planBody'),
      icon: MessageSquareText,
      iconWrap: 'bg-sky-bg text-[#1c5f8d] border-sky/35',
      target: { name: 'plan' },
    },
    {
      id: 'lesson',
      title: t('coach.tab.lesson'),
      body: t('home.lessonBody'),
      icon: FileSearch,
      iconWrap: 'bg-berry-bg text-[#5a379c] border-berry/35',
      target: { name: 'lesson' },
    },
    {
      id: 'play',
      title: t('home.playTitle'),
      body: t('home.playBody'),
      icon: Gamepad2,
      iconWrap: 'bg-terracotta-bg text-terracotta border-terracotta/35',
      badge: `${completedCount}/${gameCatalog.length}`,
      target: { name: 'play' },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div>
        <p className="label-section text-terracotta">{t('mode.tagline')}</p>
        <h1 className="heading-editorial mt-0.5">{t('mode.title')}</h1>
        <p className="text-body mt-1">{t('home.subtitle')}</p>
      </div>

      {/* Featured Primary Tool: Live Coach */}
      <button
        type="button"
        onClick={() => onNavigate({ name: 'live' })}
        className="group card-warm card-warm-interactive w-full border-amber/50 bg-gradient-to-br from-amber-bg via-parchment-light to-terracotta-bg/50 p-5 text-left touch-target sm:p-6"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#b84422] bg-terracotta text-white shadow-[0_3px_0_#a33a1b]">
            <Zap className="h-6 w-6" aria-hidden />
          </span>
          <span className="pill-amber">{t('home.featuredBadge')}</span>
        </div>

        <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
          {t('coach.tab.live')}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-relaxed text-ink-soft sm:text-base">
          {t('home.liveBody')}
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-[#b84422] bg-terracotta px-4 py-2 font-display text-sm font-bold text-white shadow-[0_3px_0_#a33a1b] transition group-hover:bg-[#c9502d]">
          {t('home.liveCta')}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>

      {/* Secondary Tools Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {secondaryTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onNavigate(tool.target)}
              className="group card-warm card-warm-interactive flex flex-col justify-between p-4 text-left touch-target sm:p-5"
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border-2 ${tool.iconWrap}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {tool.badge ? (
                    <span className="pill-sage tabular-nums">{tool.badge}</span>
                  ) : null}
                </div>

                <h2 className="card-title mb-1">{tool.title}</h2>
                <p className="text-sm leading-snug text-ink-soft">{tool.body}</p>
              </div>

              <div className="mt-4 flex items-center gap-1 font-display text-sm font-bold text-terracotta">
                {t('home.openCta')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
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
          <h1 className="heading-editorial mt-0.5">{t('scenarios.title')}</h1>
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

  const isMastered = progress.bestScore >= 100;
  const statusPillClass = isMastered
    ? 'pill-amber'
    : progress.statusKey === 'completed'
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
          <span className={statusPillClass}>
            {isMastered ? `★ ${t('status.mastered')}` : t(`status.${progress.statusKey}`)}
          </span>
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
