// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, MonitorPlay, X } from 'lucide-react';
import type { OddOneOutSet } from '../data/curriculum';
import { useLang } from '../lib/i18n';
import type { LangLens } from './coach-ui';

const TILE_TONES = [
  'border-terracotta/35 bg-terracotta-bg/60 hover:border-terracotta',
  'border-sky/35 bg-sky-bg/60 hover:border-sky',
  'border-sage/35 bg-sage-bg/60 hover:border-sage',
  'border-amber/40 bg-amber-bg/60 hover:border-amber',
];

export function OddOneOutCard({
  set,
  langLens,
}: {
  set: OddOneOutSet;
  langLens: LangLens;
}) {
  const { t } = useLang();
  const [picked, setPicked] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);

  const showEn = langLens === 'both' || langLens === 'en';
  const showL1 = langLens === 'both' || langLens === 'l1';

  return (
    <article className="card-warm space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="pill-sky">KPM {set.kpmStandard}</span>
            <span className="pill-amber inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" aria-hidden />
              {set.textbookPage}
            </span>
          </div>
          <h3 className="card-title">{set.title}</h3>
        </div>

        <button
          type="button"
          onClick={() => setPresenting(true)}
          className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm touch-target print:hidden"
        >
          <MonitorPlay className="h-4 w-4" />
          {t('primer.present')}
        </button>
      </div>

      <div>
        {showEn ? <p className="text-sm font-bold text-ink">{set.promptEn}</p> : null}
        {showL1 && set.promptBridge ? (
          <p className="mt-0.5 text-xs font-semibold italic text-ink-soft">{set.promptBridge}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {set.items.map((item, idx) => {
          const selected = picked === item.word;
          return (
            <button
              key={item.word}
              type="button"
              onClick={() => setPicked((cur) => (cur === item.word ? null : item.word))}
              aria-pressed={selected}
              className={`flex min-h-[84px] flex-col items-center justify-center rounded-2xl border-2 px-3 py-3 text-center transition touch-target ${
                TILE_TONES[idx % TILE_TONES.length]
              } ${selected ? 'ring-4 ring-terracotta/30 scale-[1.02]' : ''}`}
            >
              {showEn ? (
                <span className="font-display text-base font-bold text-ink sm:text-lg">{item.word}</span>
              ) : null}
              {showL1 && item.bridgeMalay ? (
                <span className={`${showEn ? 'mt-0.5 text-xs' : 'font-display text-base font-bold'} font-semibold text-ink-soft`}>
                  {item.bridgeMalay}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <details className="group rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 print:open">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-display text-sm font-bold text-ink [&::-webkit-details-marker]:hidden touch-target">
          <span>{t('vocab.possibleReasons')}</span>
          <ChevronDown className="h-4 w-4 text-ink-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
          {set.possibleReasons.map((entry) => (
            <div key={entry.chosenWord} className="rounded-xl border border-ink/10 bg-parchment-light px-3 py-2 text-sm">
              <span className="font-display font-bold text-terracotta">{entry.chosenWord}: </span>
              <span className="font-semibold text-ink-soft">{entry.reason}</span>
            </div>
          ))}
          <p className="rounded-xl border-2 border-sage/30 bg-sage-bg/50 px-3 py-2 text-xs font-bold text-[#1f6b4a]">
            {set.talkMovePrompt}
          </p>
        </div>
      </details>

      {presenting ? (
        <OddOneOutPresent
          set={set}
          showEn={showEn}
          showL1={showL1}
          onClose={() => setPresenting(false)}
        />
      ) : null}
    </article>
  );
}

function OddOneOutPresent({
  set,
  showEn,
  showL1,
  onClose,
}: {
  set: OddOneOutSet;
  showEn: boolean;
  showL1: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-parchment p-4 text-ink sm:p-8">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill-sky">KPM {set.kpmStandard}</span>
          <h2 className="font-display text-xl font-bold sm:text-2xl">{set.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3.5 py-2 font-display text-xs font-bold text-ink touch-target"
        >
          <X className="h-4 w-4" />
          {t('primer.close')}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6">
        <div className="text-center">
          {showEn ? <p className="font-display text-2xl font-bold text-ink sm:text-4xl">{set.promptEn}</p> : null}
          {showL1 && set.promptBridge ? (
            <p className="mt-2 text-lg font-semibold italic text-ink-soft sm:text-2xl">{set.promptBridge}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {set.items.map((item, idx) => {
            const selected = picked === item.word;
            return (
              <button
                key={item.word}
                type="button"
                onClick={() => setPicked((cur) => (cur === item.word ? null : item.word))}
                className={`flex min-h-[140px] flex-col items-center justify-center rounded-3xl border-[3px] p-5 text-center shadow-md transition sm:min-h-[180px] ${
                  TILE_TONES[idx % TILE_TONES.length]
                } ${selected ? 'ring-4 ring-terracotta/40 scale-[1.02]' : ''}`}
              >
                {showEn ? (
                  <span className="font-display text-2xl font-bold text-ink sm:text-5xl">{item.word}</span>
                ) : null}
                {showL1 && item.bridgeMalay ? (
                  <span className="mt-2 text-lg font-semibold text-ink-soft sm:text-2xl">{item.bridgeMalay}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <p className="text-center font-display text-lg font-bold text-terracotta sm:text-2xl">
          {set.talkMovePrompt}
        </p>
      </div>
    </div>
  );
}
