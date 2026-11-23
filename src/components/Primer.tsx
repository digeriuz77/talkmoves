// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { Fragment, FormEvent, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Dices, LoaderCircle, MonitorPlay, Printer } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { usePersistentState } from '../lib/usePersistentState';
import { ClassContextBar, useClassContext } from '../lib/class-context';
import {
  CollapsibleFormShell,
  CopyButton,
  LanguageLensToggle,
  SayLine,
  SegmentedTabs,
  StartNewButton,
  type LangLens,
} from './coach-ui';
import { BingoPresent, WordDeckPresent, type WordCard } from './PrimerPresent';

type PrimerGameId = 'bingo' | 'flyswatter' | 'hotseat';
type PrimerOutputTab = 'game' | 'cards' | 'talk';

type PrimerResult = {
  games: Array<{
    gameId: PrimerGameId;
    name: string;
    setupEnglish: string;
    setupBridge: string;
    controlBenefit: string;
  }>;
  wordCards: Array<{
    word: string;
    kidDefinition: string;
    clue: string;
    bridgeWord: string;
    isCognate: boolean;
    cognateNote: string;
  }>;
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

function openBingoPrintWindow(grids: string[][], title: string) {
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
                  .map((word) => `<td>${word}</td>`)
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
  body { font-family: Nunito, system-ui, sans-serif; margin: 16mm; color: #1f2421; }
  .grid-wrap { display: flex; flex-wrap: wrap; gap: 10mm; }
  .card { break-inside: avoid; }
  .card-title { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 4mm; }
  table { border-collapse: collapse; }
  td { border: 2px solid #1f2421; width: 32mm; height: 22mm; text-align: center; font-size: 16px; padding: 2mm; }
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

export default function Primer() {
  const { t } = useLang();
  const { yearLevel, subject, dominantLanguage } = useClassContext();
  const [wordsText, setWordsText, resetWordsText] = usePersistentState('tmb.primer.wordsText', '');
  const [result, setResult, resetResult] = usePersistentState<PrimerResult | null>('tmb.primer.result', null);
  const [selectedGame, setSelectedGame, resetSelectedGame] = usePersistentState<PrimerGameId | null>(
    'tmb.primer.selectedGame',
    null,
  );
  const [cardView, setCardView, resetCardView] = usePersistentState<'reference' | 'flip'>(
    'tmb.primer.cardView',
    'flip',
  );
  const [leadFace, setLeadFace, resetLeadFace] = usePersistentState<'word' | 'definition'>(
    'tmb.primer.leadFace',
    'word',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presentDeck, setPresentDeck] = useState(false);
  const [presentBingo, setPresentBingo] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState<boolean>(() => Boolean(result));
  const [outputTab, setOutputTab] = useState<PrimerOutputTab>('game');
  const [langLens, setLangLens] = useState<LangLens>('both');

  const showEn = langLens === 'both' || langLens === 'en';
  const showL1 = langLens === 'both' || langLens === 'l1';

  const clearTab = () => {
    resetWordsText();
    resetResult();
    resetSelectedGame();
    resetCardView();
    resetLeadFace();
    setFormCollapsed(false);
    setError(null);
  };

  const words = useMemo(
    () =>
      wordsText
        .split(/[,;\n]/)
        .map((w) => w.trim())
        .filter(Boolean),
    [wordsText],
  );

  const bingoGrids = useMemo(
    () => (result ? makeBingoGrids(result.gridWords, GRID_CARD_COUNT) : []),
    [result],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (words.length < 2) {
      setError(t('primer.errors.wordsRequired'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/primer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words, yearLevel, subject, dominantLanguage }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || t('primer.errors.failed'));
      }
      const plan = payload.plan as PrimerResult;
      setResult(plan);
      setSelectedGame(plan.games[0]?.gameId ?? null);
      setFormCollapsed(true);
      setOutputTab('game');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('primer.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  const activeGame = result?.games.find((g) => g.gameId === selectedGame) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <h1 className="heading-editorial">{t('coach.tab.primer')}</h1>
        {result ? (
          <button
            type="button"
            onClick={() => setPresentDeck(true)}
            className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-sm touch-target"
          >
            <MonitorPlay className="h-4 w-4" />
            {t('primer.present')}
          </button>
        ) : null}
      </div>

      <ClassContextBar />

      <CollapsibleFormShell
        collapsed={Boolean(result) && formCollapsed}
        onToggle={() => setFormCollapsed((c) => !c)}
        summary={words.length > 0 ? words.join(' · ') : t('coach.tab.primer')}
        actions={<StartNewButton onClear={clearTab} />}
      >
        <form onSubmit={handleSubmit} className="card-warm p-4 sm:p-5">
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
          {words.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {words.slice(0, 6).map((word) => (
                <span key={word} className="pill-terracotta">
                  {word}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 text-xs font-semibold text-ink-muted">{t('primer.wordsHint')}</p>
          )}

          {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 touch-target disabled:opacity-70 sm:w-auto"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />}
            {loading ? t('primer.generating') : t('primer.generate')}
          </button>
        </form>
      </CollapsibleFormShell>

      {result ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <LanguageLensToggle value={langLens} onChange={setLangLens} />
          </div>

          <SegmentedTabs
            ariaLabel={t('coach.tab.primer')}
            active={outputTab}
            onChange={setOutputTab}
            tabs={[
              { id: 'game', label: t('primer.tabGame') },
              {
                id: 'cards',
                label: t('primer.tabCards'),
                badge: String(result.wordCards.length),
              },
              { id: 'talk', label: t('primer.tabTalk') },
            ]}
          />

          {/* TAB 1: Local Hook & Game */}
          <div className={outputTab === 'game' ? 'space-y-3' : 'hidden print:block print:space-y-3'}>
            {result.localHook ? (
              <section className="card-warm p-4">
                <p className="label-section mb-1">{t('primer.localHook')}</p>
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-base font-semibold leading-snug text-ink">{result.localHook}</p>
                  <CopyButton value={result.localHook} />
                </div>
              </section>
            ) : null}

            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-2.5">{t('primer.pickGame')}</p>
              <div className="grid grid-cols-3 gap-2" role="tablist" aria-label={t('primer.pickGame')}>
                {result.games.map((game) => {
                  const selected = selectedGame === game.gameId;
                  return (
                    <button
                      key={game.gameId}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setSelectedGame(game.gameId)}
                      className={`rounded-2xl border-2 px-2.5 py-2.5 text-center transition touch-target ${
                        selected
                          ? 'border-terracotta bg-terracotta-bg text-terracotta shadow-[0_2px_0_rgba(217,93,57,0.2)]'
                          : 'border-ink/12 bg-white text-ink hover:border-ink/25'
                      }`}
                    >
                      <span className="block font-display text-xs font-bold sm:text-sm">
                        {game.name || t(`primer.game.${game.gameId}`)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeGame ? (
                <div className="mt-3">
                  {activeGame.controlBenefit ? (
                    <p className="mb-2 text-xs font-semibold text-ink-muted">{activeGame.controlBenefit}</p>
                  ) : null}
                  {showEn ? (
                    <SayLine label={t('primer.setupEnglish')} value={activeGame.setupEnglish} tone="en" />
                  ) : null}
                  {showL1 ? (
                    <SayLine label={t('primer.setupBridge')} value={activeGame.setupBridge} tone="l1" />
                  ) : null}
                  {activeGame.gameId === 'bingo' && bingoGrids.length > 0 ? (
                    <div className="mt-3 rounded-2xl border-2 border-ink/10 bg-white p-3">
                      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-ink-muted">
                          {t('primer.bingoPreview')}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPresentBingo(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-terracotta/40 bg-terracotta-bg px-3 py-1.5 font-display text-xs font-semibold text-terracotta touch-target"
                          >
                            <MonitorPlay className="h-4 w-4" />
                            {t('primer.presentBingo')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openBingoPrintWindow(bingoGrids, t('primer.bingoCardTitle'))}
                            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-parchment-light px-3 py-1.5 font-display text-xs font-semibold text-ink touch-target"
                          >
                            <Printer className="h-4 w-4" />
                            {t('primer.printBingo')}
                          </button>
                        </div>
                      </div>
                      <div className="grid max-w-xs grid-cols-3 gap-1.5">
                        {bingoGrids[0].map((word, idx) => (
                          <div
                            key={`cell-${idx}`}
                            className="flex min-h-[44px] items-center justify-center rounded-xl border-2 border-ink/15 bg-parchment-light px-2 py-1.5 text-center font-display text-xs font-semibold text-ink"
                          >
                            {word}
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-ink-muted">{t('primer.bingoHint')}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>

          {/* TAB 2: Word Cards */}
          <div className={outputTab === 'cards' ? '' : 'hidden print:block'}>
            <section className="card-warm p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex overflow-hidden rounded-full border-2 border-ink/12 bg-parchment-dark/60 p-0.5" role="tablist">
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
                  {result.wordCards.map((card) => (
                    <Fragment key={card.word}>
                      <Flashcard card={card} leadFace={leadFace} />
                    </Fragment>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {result.wordCards.map((card) => (
                    <div key={card.word} className="rounded-2xl border-2 border-ink/10 bg-white p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-base font-bold text-ink">{card.word}</p>
                        {card.bridgeWord ? <span className="pill-amber">{card.bridgeWord}</span> : null}
                        {card.isCognate ? <span className="pill-sage">{t('primer.cognate')}</span> : null}
                      </div>
                      {card.kidDefinition ? (
                        <p className="mt-1.5 text-sm text-ink-soft">{card.kidDefinition}</p>
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
          </div>

          {/* TAB 3: Talk Move Transition */}
          <div className={outputTab === 'talk' ? '' : 'hidden print:block'}>
            {result.transition.teacherLineEnglish ? (
              <section className="rounded-2xl border-2 border-terracotta/45 bg-terracotta-bg/60 p-4 sm:p-5">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="label-section">{t('primer.transition')}</p>
                  {result.transition.talkMoveId || result.transition.talkMoveName ? (
                    <span className="pill-terracotta">
                      {result.transition.talkMoveId} {result.transition.talkMoveName}
                    </span>
                  ) : null}
                </div>
                <p className="mb-2 text-xs font-semibold text-ink-muted">{t('primer.transitionHint')}</p>
                {showEn ? (
                  <SayLine label={t('live.sayEnglish')} value={result.transition.teacherLineEnglish} tone="en" />
                ) : null}
                {showL1 ? (
                  <SayLine label={t('live.sayBridge')} value={result.transition.teacherLineBridge} tone="l1" />
                ) : null}
                {result.transition.sentenceFrames.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-muted">
                      {t('lesson.frames')}
                    </p>
                    <ul className="space-y-2">
                      {result.transition.sentenceFrames.map((frame, idx) => (
                        <li
                          key={`tframe-${idx}`}
                          className="flex items-start justify-between gap-2 rounded-2xl border-2 border-ink/10 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink"
                        >
                          <span className="flex-1">{frame}</span>
                          <CopyButton value={frame} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </motion.div>
      ) : null}

      {presentDeck && result ? (
        <WordDeckPresent
          cards={result.wordCards}
          transition={result.transition}
          leadFace={leadFace}
          onClose={() => setPresentDeck(false)}
        />
      ) : null}

      {presentBingo && bingoGrids.length > 0 ? (
        <BingoPresent grids={bingoGrids} onClose={() => setPresentBingo(false)} />
      ) : null}
    </div>
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
      <p className="text-base font-semibold leading-snug text-ink-soft sm:text-lg">{card.kidDefinition}</p>
      {card.bridgeWord ? <span className="pill-terracotta text-sm">{card.bridgeWord}</span> : null}
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
