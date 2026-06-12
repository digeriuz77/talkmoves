import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Dices, LoaderCircle, Printer } from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  CopyButton,
  SayLine,
  SelectField,
  languages,
  subjectLabel,
  subjects,
  yearLevels,
} from './coach-ui';

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
  const [wordsText, setWordsText] = useState('');
  const [yearLevel, setYearLevel] = useState('4');
  const [subject, setSubject] = useState('science');
  const [dominantLanguage, setDominantLanguage] = useState('iban');
  const [result, setResult] = useState<PrimerResult | null>(null);
  const [selectedGame, setSelectedGame] = useState<PrimerGameId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                      <button
                        type="button"
                        onClick={() => openBingoPrintWindow(bingoGrids, t('primer.bingoCardTitle'))}
                        className="inline-flex items-center gap-2 rounded-lg border border-ink/20 bg-white/70 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white touch-target"
                      >
                        <Printer className="h-4 w-4" />
                        {t('primer.printBingo')}
                      </button>
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
            <p className="label-section mb-3">{t('primer.wordCards')}</p>
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
    </div>
  );
}
