import { Fragment, FormEvent, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Dices, LoaderCircle, MonitorPlay, Printer } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { usePersistentState } from '../lib/usePersistentState';
import {
  CopyButton,
  SayLine,
  SelectField,
  StartNewButton,
  languages,
  subjectLabel,
  subjects,
  yearLevels,
} from './coach-ui';
import { BingoPresent, WordDeckPresent, type WordCard } from './PrimerPresent';

type PrimerGameId = 'bingo' | 'flyswatter' | 'hotseat';

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
  body { font-family: Georgia, 'Times New Roman', serif; margin: 16mm; color: #1f2421; }
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
  const [wordsText, setWordsText, resetWordsText] = usePersistentState('tmb.primer.wordsText', '');
  const [yearLevel, setYearLevel, resetYearLevel] = usePersistentState('tmb.primer.yearLevel', '4');
  const [subject, setSubject, resetSubject] = usePersistentState('tmb.primer.subject', 'science');
  const [dominantLanguage, setDominantLanguage, resetDominantLanguage] = usePersistentState(
    'tmb.primer.dominantLanguage',
    'iban',
  );
  const [result, setResult, resetResult] = usePersistentState<PrimerResult | null>('tmb.primer.result', null);
  const [selectedGame, setSelectedGame, resetSelectedGame] = usePersistentState<PrimerGameId | null>(
    'tmb.primer.selectedGame',
    null,
  );
  const [cardView, setCardView, resetCardView] = usePersistentState<'reference' | 'flip'>(
    'tmb.primer.cardView',
    'reference',
  );
  const [leadFace, setLeadFace, resetLeadFace] = usePersistentState<'word' | 'definition'>(
    'tmb.primer.leadFace',
    'word',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presentDeck, setPresentDeck] = useState(false);
  const [presentBingo, setPresentBingo] = useState(false);

  const clearTab = () => {
    resetWordsText();
    resetYearLevel();
    resetSubject();
    resetDominantLanguage();
    resetResult();
    resetSelectedGame();
    resetCardView();
    resetLeadFace();
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('primer.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  const activeGame = result?.games.find((g) => g.gameId === selectedGame) ?? null;

  return (
    <div>
      <div className="mb-3 flex justify-end print:hidden">
        <StartNewButton onClear={clearTab} />
      </div>
      <form onSubmit={handleSubmit} className="card-warm p-4 sm:p-5 md:p-6 print:hidden">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('primer.wordsLabel')}
          </span>
          <input
            value={wordsText}
            onChange={(event) => setWordsText(event.target.value)}
            className="w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
            placeholder={t('primer.wordsPlaceholder')}
          />
        </label>
        {words.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {words.slice(0, 6).map((word) => (
              <span
                key={word}
                className="rounded-full border border-terracotta/30 bg-terracotta/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-terracotta"
              >
                {word}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs text-ink-muted">{t('primer.wordsHint')}</p>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectField
            label={t('live.yearLabel')}
            value={yearLevel}
            onChange={setYearLevel}
            options={yearLevels.map((y) => ({ value: y, label: `Year ${y}` }))}
          />
          <SelectField
            label={t('live.subjectLabel')}
            value={subject}
            onChange={setSubject}
            options={subjects.map((s) => ({ value: s, label: subjectLabel(s) }))}
          />
          <SelectField
            label={t('live.languageLabel')}
            value={dominantLanguage}
            onChange={setDominantLanguage}
            options={languages.map((l) => ({
              value: l,
              label: l.charAt(0).toUpperCase() + l.slice(1),
            }))}
          />
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-4 inline-flex items-center gap-2 rounded-lg touch-target disabled:opacity-70"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />}
          {loading ? t('primer.generating') : t('primer.generate')}
        </button>
      </form>

      {result ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-4 sm:mt-6 space-y-3 sm:space-y-4"
        >
          {result.localHook ? (
            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-1">{t('primer.localHook')}</p>
              <div className="flex items-start justify-between gap-2">
                <p className="flex-1 text-sm text-ink-soft">{result.localHook}</p>
                <CopyButton value={result.localHook} />
              </div>
            </section>
          ) : null}

          <section className="card-warm p-4 sm:p-5">
            <p className="label-section mb-3">{t('primer.pickGame')}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="tablist" aria-label={t('primer.pickGame')}>
              {result.games.map((game) => (
                <button
                  key={game.gameId}
                  type="button"
                  role="tab"
                  aria-selected={selectedGame === game.gameId}
                  onClick={() => setSelectedGame(game.gameId)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-left transition-colors touch-target ${
                    selectedGame === game.gameId
                      ? 'border-terracotta/50 bg-terracotta/10'
                      : 'border-ink/10 bg-white/50 hover:bg-white'
                  }`}
                >
                  <span
                    className={`block text-sm font-bold ${
                      selectedGame === game.gameId ? 'text-terracotta' : 'text-ink'
                    }`}
                  >
                    {game.name || t(`primer.game.${game.gameId}`)}
                  </span>
                  {game.controlBenefit ? (
                    <span className="mt-0.5 block text-xs text-ink-muted">{game.controlBenefit}</span>
                  ) : null}
                </button>
              ))}
            </div>

            {activeGame ? (
              <div className="mt-3">
                <SayLine label={t('primer.setupEnglish')} value={activeGame.setupEnglish} />
                <SayLine label={t('primer.setupBridge')} value={activeGame.setupBridge} />
                {activeGame.gameId === 'bingo' && bingoGrids.length > 0 ? (
                  <div className="mt-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        {t('primer.bingoPreview')}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPresentBingo(true)}
                          className="inline-flex items-center gap-2 rounded-lg border border-terracotta/40 bg-terracotta/10 px-3 py-2 text-xs font-semibold text-terracotta transition hover:bg-terracotta/20 touch-target"
                        >
                          <MonitorPlay className="h-4 w-4" />
                          {t('primer.presentBingo')}
                        </button>
                        <button
                          type="button"
                          onClick={() => openBingoPrintWindow(bingoGrids, t('primer.bingoCardTitle'))}
                          className="inline-flex items-center gap-2 rounded-lg border border-ink/20 bg-white/70 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white touch-target"
                        >
                          <Printer className="h-4 w-4" />
                          {t('primer.printBingo')}
                        </button>
                      </div>
                    </div>
                    <div className="inline-block rounded-lg border border-ink/15 bg-white/60 p-2">
                      <table className="border-collapse">
                        <tbody>
                          {[0, 1, 2].map((row) => (
                            <tr key={`row-${row}`}>
                              {bingoGrids[0].slice(row * 3, row * 3 + 3).map((word, col) => (
                                <td
                                  key={`cell-${row}-${col}`}
                                  className="border border-ink/30 px-3 py-2 text-center text-sm text-ink-soft"
                                >
                                  {word}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{t('primer.bingoHint')}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="card-warm p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="label-section">{t('primer.wordCards')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex overflow-hidden rounded-lg border border-ink/15" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={cardView === 'reference'}
                    onClick={() => setCardView('reference')}
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      cardView === 'reference' ? 'bg-terracotta/15 text-terracotta' : 'bg-white/60 text-ink-muted hover:bg-white'
                    }`}
                  >
                    {t('primer.viewReference')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={cardView === 'flip'}
                    onClick={() => setCardView('flip')}
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      cardView === 'flip' ? 'bg-terracotta/15 text-terracotta' : 'bg-white/60 text-ink-muted hover:bg-white'
                    }`}
                  >
                    {t('primer.viewFlip')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPresentDeck(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-terracotta/40 bg-terracotta/10 px-3 py-1.5 text-xs font-semibold text-terracotta transition hover:bg-terracotta/20 touch-target"
                >
                  <MonitorPlay className="h-4 w-4" />
                  {t('primer.present')}
                </button>
              </div>
            </div>

            {cardView === 'flip' ? (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex overflow-hidden rounded-lg border border-ink/15">
                    <button
                      type="button"
                      aria-pressed={leadFace === 'word'}
                      onClick={() => setLeadFace('word')}
                      className={`px-3 py-1.5 text-xs font-semibold ${
                        leadFace === 'word' ? 'bg-terracotta/15 text-terracotta' : 'bg-white/60 text-ink-muted hover:bg-white'
                      }`}
                    >
                      {t('primer.leadWord')}
                    </button>
                    <button
                      type="button"
                      aria-pressed={leadFace === 'definition'}
                      onClick={() => setLeadFace('definition')}
                      className={`px-3 py-1.5 text-xs font-semibold ${
                        leadFace === 'definition' ? 'bg-terracotta/15 text-terracotta' : 'bg-white/60 text-ink-muted hover:bg-white'
                      }`}
                    >
                      {t('primer.leadDefinition')}
                    </button>
                  </div>
                  <p className="text-xs text-ink-muted">{t('primer.tapToFlip')}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {result.wordCards.map((card) => (
                    <Fragment key={card.word}>
                      <Flashcard card={card} leadFace={leadFace} />
                    </Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {result.wordCards.map((card) => (
                  <div key={card.word} className="rounded-lg border border-ink/10 bg-white/50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold uppercase tracking-wide text-ink">{card.word}</p>
                      {card.bridgeWord ? (
                        <span className="rounded-full border border-ink/10 bg-white/60 px-2 py-0.5 text-[11px] text-ink-muted">
                          {card.bridgeWord}
                        </span>
                      ) : null}
                      {card.isCognate ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          {t('primer.cognate')}
                        </span>
                      ) : null}
                    </div>
                    {card.kidDefinition ? (
                      <p className="mt-1.5 text-sm text-ink-soft">{card.kidDefinition}</p>
                    ) : null}
                    {card.clue ? (
                      <div className="mt-1.5 flex items-start justify-between gap-2 rounded-lg border border-ink/10 bg-white/60 px-2.5 py-1.5">
                        <p className="flex-1 text-xs text-ink-soft">
                          <span className="font-semibold uppercase tracking-wide text-ink-muted">
                            {t('primer.clue')}:
                          </span>{' '}
                          {card.clue}
                        </p>
                        <CopyButton value={card.clue} />
                      </div>
                    ) : null}
                    {card.isCognate && card.cognateNote ? (
                      <p className="mt-1 text-xs italic text-ink-muted">{card.cognateNote}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          {result.transition.teacherLineEnglish ? (
            <section className="rounded-2xl border-2 border-terracotta/40 bg-terracotta/5 p-4 sm:p-5">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="label-section">{t('primer.transition')}</p>
                {result.transition.talkMoveId || result.transition.talkMoveName ? (
                  <span className="rounded-full border border-terracotta/30 bg-white/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-terracotta">
                    {result.transition.talkMoveId} {result.transition.talkMoveName}
                  </span>
                ) : null}
              </div>
              <p className="mb-2 text-xs text-ink-muted">{t('primer.transitionHint')}</p>
              <SayLine label={t('live.sayEnglish')} value={result.transition.teacherLineEnglish} />
              <SayLine label={t('live.sayBridge')} value={result.transition.teacherLineBridge} />
              {result.transition.sentenceFrames.length > 0 ? (
                <div className="mt-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    {t('lesson.frames')}
                  </p>
                  <ul className="space-y-1.5">
                    {result.transition.sentenceFrames.map((frame, idx) => (
                      <li
                        key={`tframe-${idx}`}
                        className="flex items-start justify-between gap-2 rounded-lg border border-ink/10 bg-white/60 px-3 py-2 text-sm text-ink-soft"
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
      <p className="text-2xl font-extrabold uppercase tracking-wide text-ink sm:text-3xl">{card.word}</p>
      {card.isCognate ? (
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
          {t('primer.cognate')}
        </span>
      ) : null}
    </div>
  );

  const meaningFace = (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <p className="text-base leading-snug text-ink-soft sm:text-lg">{card.kidDefinition}</p>
      {card.bridgeWord ? (
        <p className="rounded-full border border-terracotta/40 bg-terracotta/10 px-3 py-1 text-sm font-bold text-terracotta">
          {card.bridgeWord}
        </p>
      ) : null}
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
        className={`relative h-full w-full rounded-xl transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div className="absolute inset-0 rounded-xl border-2 border-ink/15 bg-white/70 p-4 [backface-visibility:hidden]">
          {front}
        </div>
        <div className="absolute inset-0 rounded-xl border-2 border-terracotta/30 bg-parchment-light p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>
      </div>
    </button>
  );
}
