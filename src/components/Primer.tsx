// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { Fragment, FormEvent, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Dices,
  Eye,
  EyeOff,
  LoaderCircle,
  MonitorPlay,
  Printer,
  RotateCw,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { usePersistentState } from '../lib/usePersistentState';
import { useClassContext } from '../lib/class-context';
import { useActiveStrategy } from '../lib/strategy-context';
import {
  curriculumUnits,
  type CurriculumWord,
  type VocabTier,
} from '../data/curriculum';
import {
  loadVocabReviewMap,
  markWordsTaught,
  recordWordsReviewed,
  saveVocabReviewMap,
  selectSpacedRetrievalWords,
  type VocabReviewMap,
} from '../lib/vocab-retrieval';
import {
  AiNotice,
  CollapsibleFormShell,
  CopyButton,
  LanguageLensToggle,
  PrivacyNotice,
  SayLine,
  SegmentedTabs,
  StartNewButton,
  StrategySpotlightBadge,
  type LangLens,
} from './coach-ui';
import StrategyBar from './StrategyBar';
import { BingoPresent, WordDeckPresent, type WordCard } from './PrimerPresent';
import { ConceptCartoonCard } from './ConceptCartoonView';
import { OddOneOutCard } from './OddOneOutView';

type PrimerGameId = 'bingo' | 'flyswatter' | 'hotseat';
type SourceMode = 'textbook' | 'custom';
type TextbookTab = 'games' | 'cards' | 'oddOneOut' | 'cartoons';
type TierFilter = 'all' | VocabTier;

type PrimerResult = {
  games: Array<{
    gameId: PrimerGameId;
    name: string;
    setupEnglish: string;
    setupBridge: string;
    controlBenefit: string;
  }>;
  wordCards: WordCard[];
  gridWords: string[];
  localHook: string;
  transition: {
    talkMoveId: string;
    talkMoveName: string;
    teacherLineEnglish: string;
    teacherLineBridge: string;
    sentenceFrames: string[];
  };
};

const GRID_CARD_COUNT = 4;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeBingoGrids(gridWords: string[], count: number): string[][] {
  const pool = gridWords.filter(Boolean);
  if (pool.length === 0) return [];
  const grids: string[][] = [];
  for (let i = 0; i < count; i += 1) {
    const padded: string[] = [];
    while (padded.length < 9) {
      padded.push(...shuffle(pool));
    }
    grids.push(padded.slice(0, 9));
  }
  return grids;
}

function curriculumWordToCard(item: CurriculumWord): WordCard {
  return {
    word: item.word,
    kidDefinition: item.kidDefinition,
    clue: item.clue,
    bridgeWord: item.bridgeIban ? `${item.bridgeMalay} / ${item.bridgeIban}` : item.bridgeMalay,
    isCognate: item.isCognate,
    cognateNote: item.cognateNote ?? '',
    gesture: item.gesture,
  };
}

function openBingoPrintWindow(grids: string[][], title: string, cardLookup: Record<string, WordCard>) {
  const cardsHtml = grids
    .map(
      (grid, idx) => `
      <div class="card">
        <p class="card-title">${title} ${idx + 1}</p>
        <table>
          ${[0, 1, 2]
            .map(
              (row) =>
                `<tr>${grid
                  .slice(row * 3, row * 3 + 3)
                  .map((word) => {
                    const card = cardLookup[word.toLowerCase()];
                    const def = card ? `<div class="def">${card.kidDefinition}</div>` : '';
                    return `<td><strong>${word}</strong>${def}</td>`;
                  })
                  .join('')}</tr>`,
            )
            .join('')}
        </table>
      </div>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: Nunito, system-ui, sans-serif; margin: 14mm; color: #1f2421; }
  .grid-wrap { display: flex; flex-wrap: wrap; gap: 10mm; }
  .card { break-inside: avoid; }
  .card-title { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 4mm; }
  table { border-collapse: collapse; }
  td { border: 2px solid #1f2421; width: 38mm; height: 26mm; text-align: center; font-size: 14px; padding: 2mm; vertical-align: middle; }
  .def { font-size: 9px; color: #555; margin-top: 2px; line-height: 1.2; }
</style>
</head>
<body>
  <div class="grid-wrap">${cardsHtml}</div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}

type PrimerProps = {
  /** Opens the AI Concept Cartoon Studio (another route). */
  onOpenStudio?: () => void;
};

export default function Primer({ onOpenStudio }: PrimerProps = {}) {
  const { t, lang } = useLang();
  const { yearLevel, subject, dominantLanguage } = useClassContext();
  const { activeStrategy } = useActiveStrategy();

  // Source mode: default to non-generative KPM textbook resource
  const [sourceMode, setSourceMode] = usePersistentState<SourceMode>('tmb.primer.sourceMode', 'textbook');
  const [selectedUnitId, setSelectedUnitId] = usePersistentState<string>(
    'tmb.primer.unitId',
    curriculumUnits[0]?.id ?? '',
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [textbookTab, setTextbookTab] = useState<TextbookTab>('games');
  const [selectedGame, setSelectedGame] = usePersistentState<PrimerGameId>('tmb.primer.selectedGame', 'bingo');
  const [cardView, setCardView] = usePersistentState<'reference' | 'flip'>('tmb.primer.cardView', 'flip');
  const [leadFace, setLeadFace] = usePersistentState<'word' | 'definition'>('tmb.primer.leadFace', 'word');
  const [langLens, setLangLens] = useState<LangLens>('both');

  // Local-first spaced retrieval state (zero database)
  const [reviewMap, setReviewMap] = useState<VocabReviewMap>(() => loadVocabReviewMap());
  const [quickFireWords, setQuickFireWords] = useState<CurriculumWord[] | null>(null);
  const [taughtFlash, setTaughtFlash] = useState(false);

  // Fullscreen modals
  const [presentDeck, setPresentDeck] = useState(false);
  const [presentBingo, setPresentBingo] = useState(false);

  // Custom AI mode state (optional fallback)
  const [wordsText, setWordsText, resetWordsText] = usePersistentState('tmb.primer.wordsText', '');
  const [customResult, setCustomResult, resetCustomResult] = usePersistentState<PrimerResult | null>(
    'tmb.primer.result',
    null,
  );
  // Core 6 strategy the stored custom primer was generated with (echoed by the server).
  const [customStrategy, setCustomStrategy, resetCustomStrategy] = usePersistentState<string>(
    'tmb.primer.strategy',
    '',
  );
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [customFormCollapsed, setCustomFormCollapsed] = useState<boolean>(() => Boolean(customResult));

  const activeUnit = useMemo(
    () => curriculumUnits.find((u) => u.id === selectedUnitId) ?? curriculumUnits[0],
    [selectedUnitId],
  );

  const activeLesson = useMemo(
    () =>
      selectedLessonId === 'all'
        ? null
        : activeUnit?.lessons.find((l) => l.id === selectedLessonId) ?? null,
    [activeUnit, selectedLessonId],
  );

  // Filtered words from active KPM unit/lesson/tier (or Quick-Fire retrieval subset)
  const visibleCurriculumWords = useMemo(() => {
    if (!activeUnit) return [];
    let list = activeUnit.words;
    if (activeLesson) {
      const allowed = new Set(activeLesson.wordIds);
      list = list.filter((w) => allowed.has(w.id));
    }
    if (tierFilter !== 'all') {
      list = list.filter((w) => w.tier === tierFilter);
    }
    return list;
  }, [activeUnit, activeLesson, tierFilter]);

  const activeTextbookCards: WordCard[] = useMemo(() => {
    const source = quickFireWords ?? visibleCurriculumWords;
    return source.map(curriculumWordToCard);
  }, [quickFireWords, visibleCurriculumWords]);

  const activeCartoons = useMemo(() => {
    if (!activeUnit) return [];
    if (!activeLesson) return activeUnit.conceptCartoons;
    const allowed = new Set(activeLesson.conceptCartoonIds);
    return activeUnit.conceptCartoons.filter((c) => allowed.has(c.id));
  }, [activeUnit, activeLesson]);

  const activeOddOneOut = useMemo(() => {
    if (!activeUnit) return [];
    if (!activeLesson) return activeUnit.oddOneOutSets;
    const allowed = new Set(activeLesson.oddOneOutIds);
    return activeUnit.oddOneOutSets.filter((s) => allowed.has(s.id));
  }, [activeUnit, activeLesson]);

  const currentWordCards =
    sourceMode === 'textbook' ? activeTextbookCards : customResult?.wordCards ?? [];

  const cardLookup = useMemo(() => {
    const map: Record<string, WordCard> = {};
    for (const card of currentWordCards) {
      map[card.word.toLowerCase()] = card;
    }
    return map;
  }, [currentWordCards]);

  const bingoWords = useMemo(() => {
    if (sourceMode === 'textbook') {
      return activeTextbookCards.map((c) => c.word);
    }
    return customResult?.gridWords ?? [];
  }, [sourceMode, activeTextbookCards, customResult]);

  const bingoGrids = useMemo(() => makeBingoGrids(bingoWords, GRID_CARD_COUNT), [bingoWords]);

  const taughtCount = Object.keys(reviewMap).length;

  const handleMarkLessonTaught = () => {
    const ids = visibleCurriculumWords.map((w) => w.id);
    if (ids.length === 0) return;
    const next = markWordsTaught(reviewMap, ids);
    setReviewMap(next);
    saveVocabReviewMap(next);
    setTaughtFlash(true);
    window.setTimeout(() => setTaughtFlash(false), 1800);
  };

  const handleQuickFire = () => {
    if (!activeUnit) return;
    const allWords = curriculumUnits.flatMap((u) => u.words);
    const { words } = selectSpacedRetrievalWords(allWords, reviewMap, 5);
    const next = recordWordsReviewed(reviewMap, words.map((w) => w.id));
    setReviewMap(next);
    saveVocabReviewMap(next);
    setQuickFireWords(words);
    setTextbookTab('cards');
  };

  const customWords = useMemo(
    () =>
      wordsText
        .split(/[,;\n]/)
        .map((w) => w.trim())
        .filter(Boolean),
    [wordsText],
  );

  const handleCustomSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (customWords.length < 2) {
      setCustomError(t('primer.errors.wordsRequired'));
      return;
    }
    setCustomError(null);
    setCustomLoading(true);
    try {
      const response = await fetch('/api/primer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: customWords, yearLevel, subject, dominantLanguage, activeStrategy }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || t('primer.errors.failed'));
      }
      setCustomResult(payload.plan as PrimerResult);
      setCustomStrategy(payload?.meta?.strategy?.id || '');
      setCustomFormCollapsed(true);
    } catch (requestError) {
      setCustomError(requestError instanceof Error ? requestError.message : t('primer.errors.failed'));
    } finally {
      setCustomLoading(false);
    }
  };

  const showEn = langLens === 'both' || langLens === 'en';
  const showL1 = langLens === 'both' || langLens === 'l1';

  return (
    <div className="space-y-4">
      {/* Header + Source Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="heading-editorial">{t('vocab.hubTitle')}</h1>
        <div
          role="tablist"
          aria-label="Vocabulary source"
          className="inline-flex rounded-2xl border-2 border-ink/12 bg-parchment-dark/65 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={sourceMode === 'textbook'}
            onClick={() => setSourceMode('textbook')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-display text-xs font-semibold transition sm:text-sm ${
              sourceMode === 'textbook'
                ? 'bg-white text-terracotta shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            {t('vocab.sourceTextbook')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceMode === 'custom'}
            onClick={() => setSourceMode('custom')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-display text-xs font-semibold transition sm:text-sm ${
              sourceMode === 'custom'
                ? 'bg-white text-terracotta shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {t('vocab.sourceCustom')}
          </button>
        </div>
      </div>

      {/* ============================================
          NON-GENERATIVE KPM TEXTBOOK RESOURCE MODE
          ============================================ */}
      {sourceMode === 'textbook' && activeUnit ? (
        <div className="space-y-3.5">
          {/* KPM Unit & Standard Navigation Card */}
          <section className="card-warm space-y-3 p-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill-terracotta">
                  Year {activeUnit.yearLevel} · {activeUnit.kpmCode}
                </span>
                <span className="font-display text-base font-bold text-ink sm:text-lg">
                  {lang === 'ms' ? activeUnit.titleMs : activeUnit.title}
                </span>
                <span className="text-xs font-bold text-ink-muted">{activeUnit.pages}</span>
              </div>

              {curriculumUnits.length > 1 ? (
                <select
                  aria-label="Select KPM unit"
                  value={activeUnit.id}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value);
                    setSelectedLessonId('all');
                    setQuickFireWords(null);
                  }}
                  className="min-h-[40px] rounded-xl border-2 border-ink/15 bg-white px-3 py-1.5 text-base font-bold text-ink sm:text-xs"
                >
                  {curriculumUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      Y{unit.yearLevel} {unit.kpmCode}: {unit.title} ({unit.pages})
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {/* KPM Lesson Standard Pills */}
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedLessonId('all');
                  setQuickFireWords(null);
                }}
                className={`min-h-[38px] shrink-0 rounded-full border-2 px-3.5 py-1 font-display text-xs font-bold transition ${
                  selectedLessonId === 'all' && !quickFireWords
                    ? 'border-terracotta bg-terracotta text-white'
                    : 'border-ink/12 bg-white text-ink-soft hover:border-ink/30'
                }`}
              >
                {t('filter.all')} ({activeUnit.pages})
              </button>
              {activeUnit.lessons.map((lesson) => {
                const active = selectedLessonId === lesson.id && !quickFireWords;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setSelectedLessonId(lesson.id);
                      setQuickFireWords(null);
                    }}
                    className={`min-h-[38px] shrink-0 rounded-full border-2 px-3.5 py-1 font-display text-xs font-bold transition ${
                      active
                        ? 'border-terracotta bg-terracotta text-white'
                        : 'border-ink/12 bg-white text-ink-soft hover:border-ink/30'
                    }`}
                  >
                    {lesson.code} {lang === 'ms' ? lesson.titleMs ?? lesson.title : lesson.title} ({lesson.pages})
                  </button>
                );
              })}
            </div>

            {/* Spaced Retrieval Bar: Mark Taught + Quick-Fire 5 */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'tier3', 'tier2', 'connector'] as TierFilter[]).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => {
                      setTierFilter(tier);
                      setQuickFireWords(null);
                    }}
                    className={`min-h-[34px] rounded-full border px-2.5 py-1 font-display text-[11px] font-bold transition ${
                      tierFilter === tier && !quickFireWords
                        ? 'border-sky bg-sky-bg text-[#1c5f8d]'
                        : 'border-ink/10 bg-parchment-light text-ink-muted hover:text-ink'
                    }`}
                  >
                    {t(`vocab.tier.${tier}`)}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkLessonTaught}
                  className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 font-display text-xs font-bold transition touch-target ${
                    taughtFlash
                      ? 'border-sage bg-sage-bg text-[#1f6b4a]'
                      : 'border-ink/12 bg-white text-ink hover:border-sage/50'
                  }`}
                >
                  <Check className="h-3.5 w-3.5 text-sage" />
                  {taughtFlash ? t('vocab.markedTaught') : t('vocab.markTaught')}
                </button>

                <button
                  type="button"
                  onClick={handleQuickFire}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-amber/45 bg-amber-bg px-3 py-1.5 font-display text-xs font-bold text-[#9e5f06] transition hover:bg-amber/20 touch-target"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  {t('vocab.quickFire5')}
                  {taughtCount > 0 ? <span className="tabular-nums">({taughtCount})</span> : null}
                </button>
              </div>
            </div>

            {quickFireWords ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-amber/40 bg-amber-bg/70 px-3 py-2 text-xs font-bold text-[#7c4902]">
                <span>{t('vocab.quickFireActive')}</span>
                <button
                  type="button"
                  onClick={() => setQuickFireWords(null)}
                  className="underline"
                >
                  {t('primer.close')}
                </button>
              </div>
            ) : null}
          </section>

          {/* Language Lens + Present Deck */}
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <LanguageLensToggle value={langLens} onChange={setLangLens} />
            <button
              type="button"
              onClick={() => setPresentDeck(true)}
              className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm touch-target"
            >
              <MonitorPlay className="h-4 w-4" />
              {t('primer.present')} ({activeTextbookCards.length})
            </button>
          </div>

          <SegmentedTabs
            ariaLabel={t('vocab.hubTitle')}
            active={textbookTab}
            onChange={setTextbookTab}
            tabs={[
              { id: 'games', label: t('vocab.tabGames') },
              { id: 'cards', label: t('primer.tabCards'), badge: String(activeTextbookCards.length) },
              { id: 'oddOneOut', label: t('vocab.tabOddOneOut'), badge: String(activeOddOneOut.length) },
              { id: 'cartoons', label: t('vocab.tabCartoons'), badge: String(activeCartoons.length) },
            ]}
          />

          {/* TAB 1: Vocabulary Games (Flippable Bingo + Flyswatter & Hot Seat with Caller Definitions) */}
          {textbookTab === 'games' ? (
            <VocabGamesPanel
              selectedGame={selectedGame}
              onSelectGame={setSelectedGame}
              wordCards={activeTextbookCards}
              bingoGrids={bingoGrids}
              cardLookup={cardLookup}
              onPresentBingo={() => setPresentBingo(true)}
              onPrintBingo={() => openBingoPrintWindow(bingoGrids, t('primer.bingoCardTitle'), cardLookup)}
            />
          ) : null}

          {/* TAB 2: Word Cards */}
          {textbookTab === 'cards' ? (
            <WordCardsPanel
              cards={activeTextbookCards}
              cardView={cardView}
              setCardView={setCardView}
              leadFace={leadFace}
              setLeadFace={setLeadFace}
            />
          ) : null}

          {/* TAB 3: Odd One Out Concept Sets */}
          {textbookTab === 'oddOneOut' ? (
            <div className="space-y-3.5">
              {activeOddOneOut.map((set) => (
                <OddOneOutCard key={set.id} set={set} langLens={langLens} />
              ))}
            </div>
          ) : null}

          {/* TAB 4: Code-Rendered Concept Cartoons */}
          {textbookTab === 'cartoons' ? (
            <div className="space-y-4">
              {activeCartoons.map((cartoon) => (
                <ConceptCartoonCard key={cartoon.id} cartoon={cartoon} langLens={langLens} />
              ))}
              {onOpenStudio ? (
                <button
                  type="button"
                  onClick={onOpenStudio}
                  className="card-warm card-warm-interactive flex w-full items-center gap-3 p-4 text-left touch-target print:hidden"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-amber/45 bg-amber-bg text-[#9e5f06]">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="card-title block">{t('studio.openStudio')}</span>
                    <span className="text-sm leading-snug text-ink-soft">{t('studio.openStudioBody')}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-terracotta" aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        /* ============================================
           OPTIONAL CUSTOM WORDS (AI) FALLBACK MODE
           ============================================ */
        <div className="space-y-4">
          <StrategyBar />

          <CollapsibleFormShell
            collapsed={Boolean(customResult) && customFormCollapsed}
            onToggle={() => setCustomFormCollapsed((c) => !c)}
            summary={customWords.length > 0 ? customWords.join(' · ') : t('vocab.sourceCustom')}
            actions={
              <StartNewButton
                onClear={() => {
                  resetWordsText();
                  resetCustomResult();
                  resetCustomStrategy();
                  setCustomFormCollapsed(false);
                  setCustomError(null);
                }}
              />
            }
          >
            <form onSubmit={handleCustomSubmit} className="card-warm p-4 sm:p-5">
              <PrivacyNotice />
              <label className="block">
                <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-muted">
                  {t('primer.wordsLabel')}
                </span>
                <input
                  value={wordsText}
                  onChange={(event) => setWordsText(event.target.value)}
                  className="min-h-[44px] w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-base text-ink outline-none transition focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/20 sm:text-sm"
                  placeholder={t('primer.wordsPlaceholder')}
                />
              </label>
              <p className="mt-1.5 text-xs font-semibold text-ink-muted">{t('primer.wordsHint')}</p>
              {customError ? <p className="mt-3 text-sm font-bold text-red-700">{customError}</p> : null}
              <button
                type="submit"
                disabled={customLoading}
                className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 touch-target disabled:opacity-70 sm:w-auto"
              >
                {customLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />}
                {customLoading ? t('primer.generating') : t('primer.generate')}
              </button>
            </form>
          </CollapsibleFormShell>

          {customResult ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3.5">
              {/* Generated output header: strategy spotlight + AI transparency */}
              <div className="flex flex-wrap items-center gap-2">
                <StrategySpotlightBadge strategyId={customStrategy} />
                <AiNotice />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <LanguageLensToggle value={langLens} onChange={setLangLens} />
                <button
                  type="button"
                  onClick={() => setPresentDeck(true)}
                  className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs touch-target"
                >
                  <MonitorPlay className="h-4 w-4" />
                  {t('primer.present')}
                </button>
              </div>

              {customResult.localHook ? (
                <section className="card-warm p-4">
                  <p className="label-section mb-1">{t('primer.localHook')}</p>
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 text-sm font-semibold text-ink">{customResult.localHook}</p>
                    <CopyButton value={customResult.localHook} />
                  </div>
                </section>
              ) : null}

              <VocabGamesPanel
                selectedGame={selectedGame}
                onSelectGame={setSelectedGame}
                wordCards={customResult.wordCards}
                bingoGrids={bingoGrids}
                cardLookup={cardLookup}
                customGames={customResult.games}
                showEn={showEn}
                showL1={showL1}
                onPresentBingo={() => setPresentBingo(true)}
                onPrintBingo={() => openBingoPrintWindow(bingoGrids, t('primer.bingoCardTitle'), cardLookup)}
              />

              <WordCardsPanel
                cards={customResult.wordCards}
                cardView={cardView}
                setCardView={setCardView}
                leadFace={leadFace}
                setLeadFace={setLeadFace}
              />

              {customResult.transition.teacherLineEnglish ? (
                <section className="rounded-2xl border-2 border-terracotta/45 bg-terracotta-bg/60 p-4">
                  <p className="label-section mb-1">{t('primer.transition')}</p>
                  {showEn ? <SayLine label={t('live.sayEnglish')} value={customResult.transition.teacherLineEnglish} tone="en" /> : null}
                  {showL1 ? <SayLine label={t('live.sayBridge')} value={customResult.transition.teacherLineBridge} tone="l1" /> : null}
                </section>
              ) : null}
            </motion.div>
          ) : null}
        </div>
      )}

      {presentDeck && currentWordCards.length > 0 ? (
        <WordDeckPresent
          cards={currentWordCards}
          transition={sourceMode === 'custom' ? customResult?.transition : undefined}
          leadFace={leadFace}
          onClose={() => setPresentDeck(false)}
        />
      ) : null}

      {presentBingo && bingoGrids.length > 0 ? (
        <BingoPresent
          grids={bingoGrids}
          cardLookup={cardLookup}
          onClose={() => setPresentBingo(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Unified games panel with Flippable Bingo tiles AND a live Caller Definition & Clue Deck
 * for Flyswatter and Hot Seat (including a "Hide word" toggle for Hot Seat).
 */
function VocabGamesPanel({
  selectedGame,
  onSelectGame,
  wordCards,
  bingoGrids,
  cardLookup,
  customGames,
  showEn = true,
  showL1 = true,
  onPresentBingo,
  onPrintBingo,
}: {
  selectedGame: PrimerGameId;
  onSelectGame: (game: PrimerGameId) => void;
  wordCards: WordCard[];
  bingoGrids: string[][];
  cardLookup: Record<string, WordCard>;
  customGames?: PrimerResult['games'];
  showEn?: boolean;
  showL1?: boolean;
  onPresentBingo: () => void;
  onPrintBingo: () => void;
}) {
  const { t } = useLang();
  const [flippedPreview, setFlippedPreview] = useState<Record<number, boolean>>({});
  const [callerIndex, setCallerIndex] = useState(0);
  const [hideWordForHotSeat, setHideWordForHotSeat] = useState(false);

  const gameList: Array<{ id: PrimerGameId; label: string; tip: string }> = [
    { id: 'bingo', label: t('primer.game.bingo'), tip: t('vocab.gameTip.bingo') },
    { id: 'flyswatter', label: t('primer.game.flyswatter'), tip: t('vocab.gameTip.flyswatter') },
    { id: 'hotseat', label: t('primer.game.hotseat'), tip: t('vocab.gameTip.hotseat') },
  ];

  const customActive = customGames?.find((g) => g.gameId === selectedGame);
  const activeCallerCard = wordCards[callerIndex % Math.max(1, wordCards.length)];
  const previewGrid = bingoGrids[0] ?? [];
  const allPreviewFlipped = previewGrid.length > 0 && previewGrid.every((_, idx) => flippedPreview[idx]);

  return (
    <section className="card-warm space-y-3.5 p-4 sm:p-5">
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label={t('primer.pickGame')}>
        {gameList.map((game) => {
          const selected = selectedGame === game.id;
          return (
            <button
              key={game.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelectGame(game.id)}
              className={`rounded-2xl border-2 px-2.5 py-2.5 text-center transition touch-target ${
                selected
                  ? 'border-terracotta bg-terracotta-bg text-terracotta shadow-[0_2px_0_rgba(217,93,57,0.2)]'
                  : 'border-ink/12 bg-white text-ink hover:border-ink/25'
              }`}
            >
              <span className="block font-display text-xs font-bold sm:text-sm">{game.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs font-semibold text-ink-soft">
        {gameList.find((g) => g.id === selectedGame)?.tip}
      </p>

      {customActive ? (
        <div>
          {showEn ? <SayLine label={t('primer.setupEnglish')} value={customActive.setupEnglish} tone="en" /> : null}
          {showL1 ? <SayLine label={t('primer.setupBridge')} value={customActive.setupBridge} tone="l1" /> : null}
        </div>
      ) : null}

      {/* FLIPPABLE BINGO PREVIEW */}
      {selectedGame === 'bingo' && previewGrid.length > 0 ? (
        <div className="rounded-2xl border-2 border-ink/10 bg-white p-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-ink-muted">
              {t('vocab.tapBingoToFlip')}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (allPreviewFlipped) {
                    setFlippedPreview({});
                  } else {
                    const next: Record<number, boolean> = {};
                    previewGrid.forEach((_, idx) => {
                      next[idx] = true;
                    });
                    setFlippedPreview(next);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-xl border-2 border-ink/15 bg-parchment-light px-2.5 py-1.5 font-display text-xs font-bold text-ink touch-target"
              >
                <RotateCw className="h-3.5 w-3.5" />
                {allPreviewFlipped ? t('vocab.showWords') : t('vocab.flipAllMeanings')}
              </button>
              <button
                type="button"
                onClick={onPresentBingo}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-terracotta/40 bg-terracotta-bg px-3 py-1.5 font-display text-xs font-bold text-terracotta touch-target"
              >
                <MonitorPlay className="h-4 w-4" />
                {t('primer.presentBingo')}
              </button>
              <button
                type="button"
                onClick={onPrintBingo}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3 py-1.5 font-display text-xs font-bold text-ink touch-target"
              >
                <Printer className="h-4 w-4" />
                {t('primer.printBingo')}
              </button>
            </div>
          </div>

          <div className="grid max-w-lg grid-cols-3 gap-2">
            {previewGrid.map((word, idx) => {
              const flipped = Boolean(flippedPreview[idx]);
              const card = cardLookup[word.toLowerCase()];
              return (
                <button
                  key={`bcell-${idx}`}
                  type="button"
                  aria-pressed={flipped}
                  onClick={() => setFlippedPreview((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                  className={`flex min-h-[84px] flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 text-center transition touch-target ${
                    flipped
                      ? 'border-terracotta bg-terracotta-bg text-ink'
                      : 'border-ink/15 bg-parchment-light text-ink hover:border-terracotta/40'
                  }`}
                >
                  {flipped && card ? (
                    <>
                      <span className="text-[11px] font-bold leading-snug text-ink">{card.kidDefinition}</span>
                      {card.bridgeWord ? (
                        <span className="mt-1 rounded-full bg-white px-2 py-0.5 font-display text-[10px] font-bold text-terracotta">
                          {card.bridgeWord}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="font-display text-sm font-bold text-ink">{word}</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-muted">{t('primer.bingoHint')}</p>
        </div>
      ) : null}

      {/* LIVE CALLER DEFINITION & CLUE DECK (powers Bingo calling, Flyswatter, and Hot Seat!) */}
      {activeCallerCard ? (
        <div className="rounded-2xl border-2 border-sky/30 bg-sky-bg/45 p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-[#1c5f8d]">
              {t('vocab.callerDeck')} · {(callerIndex % wordCards.length) + 1}/{wordCards.length}
            </span>
            <div className="flex items-center gap-1.5">
              {selectedGame === 'hotseat' ? (
                <button
                  type="button"
                  onClick={() => setHideWordForHotSeat((h) => !h)}
                  className="inline-flex items-center gap-1 rounded-xl border-2 border-ink/15 bg-white px-2.5 py-1.5 font-display text-xs font-bold text-ink touch-target"
                >
                  {hideWordForHotSeat ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {hideWordForHotSeat ? t('vocab.showWord') : t('vocab.hideWord')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setCallerIndex((i) => (i + 1) % wordCards.length)}
                className="btn-primary px-3.5 py-1.5 text-xs touch-target"
              >
                {t('primer.next')} →
              </button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-ink/12 bg-white p-3.5">
            {!(selectedGame === 'hotseat' && hideWordForHotSeat) ? (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-display text-xl font-bold text-ink">{activeCallerCard.word}</span>
                {activeCallerCard.bridgeWord ? (
                  <span className="pill-amber">{activeCallerCard.bridgeWord}</span>
                ) : null}
              </div>
            ) : (
              <p className="mb-2 font-display text-sm font-bold text-terracotta">
                {t('vocab.wordHiddenHint')}
              </p>
            )}
            <p className="text-sm font-bold text-ink">{activeCallerCard.kidDefinition}</p>
            {activeCallerCard.clue ? (
              <p className="mt-1.5 text-xs font-semibold text-ink-soft">
                <span className="font-extrabold uppercase text-ink-muted">{t('primer.clue')}: </span>
                {activeCallerCard.clue}
              </p>
            ) : null}
            {activeCallerCard.gesture ? (
              <p className="mt-1.5 text-xs font-bold text-[#1f6b4a]">
                {t('vocab.gesture')}: {activeCallerCard.gesture}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WordCardsPanel({
  cards,
  cardView,
  setCardView,
  leadFace,
  setLeadFace,
}: {
  cards: WordCard[];
  cardView: 'reference' | 'flip';
  setCardView: (view: 'reference' | 'flip') => void;
  leadFace: 'word' | 'definition';
  setLeadFace: (face: 'word' | 'definition') => void;
}) {
  const { t } = useLang();

  return (
    <section className="card-warm p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex overflow-hidden rounded-full border-2 border-ink/12 bg-parchment-dark/60 p-0.5"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={cardView === 'flip'}
            onClick={() => setCardView('flip')}
            className={`min-h-[36px] rounded-full px-3 font-display text-xs font-semibold ${
              cardView === 'flip' ? 'bg-white text-terracotta shadow-sm' : 'text-ink-muted'
            }`}
          >
            {t('primer.viewFlip')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={cardView === 'reference'}
            onClick={() => setCardView('reference')}
            className={`min-h-[36px] rounded-full px-3 font-display text-xs font-semibold ${
              cardView === 'reference' ? 'bg-white text-terracotta shadow-sm' : 'text-ink-muted'
            }`}
          >
            {t('primer.viewReference')}
          </button>
        </div>

        {cardView === 'flip' ? (
          <div className="inline-flex overflow-hidden rounded-full border-2 border-ink/12 bg-parchment-dark/60 p-0.5">
            <button
              type="button"
              aria-pressed={leadFace === 'word'}
              onClick={() => setLeadFace('word')}
              className={`min-h-[36px] rounded-full px-3 font-display text-xs font-semibold ${
                leadFace === 'word' ? 'bg-white text-terracotta shadow-sm' : 'text-ink-muted'
              }`}
            >
              {t('primer.leadWord')}
            </button>
            <button
              type="button"
              aria-pressed={leadFace === 'definition'}
              onClick={() => setLeadFace('definition')}
              className={`min-h-[36px] rounded-full px-3 font-display text-xs font-semibold ${
                leadFace === 'definition' ? 'bg-white text-terracotta shadow-sm' : 'text-ink-muted'
              }`}
            >
              {t('primer.leadDefinition')}
            </button>
          </div>
        ) : null}
      </div>

      {cardView === 'flip' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <Fragment key={card.word}>
              <Flashcard card={card} leadFace={leadFace} />
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {cards.map((card) => (
            <div key={card.word} className="rounded-2xl border-2 border-ink/10 bg-white p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-base font-bold text-ink">{card.word}</p>
                {card.bridgeWord ? <span className="pill-amber">{card.bridgeWord}</span> : null}
                {card.isCognate ? <span className="pill-sage">{t('primer.cognate')}</span> : null}
              </div>
              {card.kidDefinition ? (
                <p className="mt-1.5 text-sm font-semibold text-ink-soft">{card.kidDefinition}</p>
              ) : null}
              {card.gesture ? (
                <p className="mt-1 text-xs font-bold text-[#1f6b4a]">
                  {t('vocab.gesture')}: {card.gesture}
                </p>
              ) : null}
              {card.clue ? (
                <div className="mt-2 flex items-start justify-between gap-2 rounded-xl bg-parchment-light px-3 py-2">
                  <p className="flex-1 text-xs font-semibold text-ink-soft">
                    <span className="font-extrabold uppercase text-ink-muted">{t('primer.clue')}: </span>
                    {card.clue}
                  </p>
                  <CopyButton value={card.clue} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Flashcard({ card, leadFace }: { card: WordCard; leadFace: 'word' | 'definition' }) {
  const { t } = useLang();
  const [flipped, setFlipped] = useState(false);

  const wordFace = (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{card.word}</p>
      {card.isCognate ? <span className="pill-sage">{t('primer.cognate')}</span> : null}
    </div>
  );

  const meaningFace = (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm font-bold leading-snug text-ink sm:text-base">{card.kidDefinition}</p>
      {card.bridgeWord ? <span className="pill-terracotta text-xs">{card.bridgeWord}</span> : null}
    </div>
  );

  const front = leadFace === 'word' ? wordFace : meaningFace;
  const back = leadFace === 'word' ? meaningFace : wordFace;

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      className="group h-40 w-full [perspective:1000px] sm:h-44"
      title={flipped ? t('primer.flipBack') : t('primer.tapToFlip')}
    >
      <div
        className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div className="absolute inset-0 rounded-2xl border-2 border-ink/15 bg-white p-4 shadow-[0_3px_0_rgba(39,34,32,0.08)] [backface-visibility:hidden]">
          {front}
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-terracotta/40 bg-terracotta-bg/60 p-4 shadow-[0_3px_0_rgba(217,93,57,0.16)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>
      </div>
    </button>
  );
}
