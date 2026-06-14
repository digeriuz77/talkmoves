import { useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLang } from '../lib/i18n';

export type WordCard = {
  word: string;
  kidDefinition: string;
  clue: string;
  bridgeWord: string;
  isCognate: boolean;
  cognateNote: string;
};

type Transition = {
  talkMoveName: string;
  teacherLineEnglish: string;
  teacherLineBridge: string;
  sentenceFrames: string[];
};

function useFullscreenChrome(onClose: () => void, onPrev: () => void, onNext: () => void) {
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') onPrev();
      else if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, onPrev, onNext]);

  return {
    onTouchStart: (event: TouchEvent) => {
      touchStartX.current = event.changedTouches[0]?.clientX ?? null;
    },
    onTouchEnd: (event: TouchEvent) => {
      if (touchStartX.current === null) return;
      const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
      if (delta > 50) onPrev();
      else if (delta < -50) onNext();
      touchStartX.current = null;
    },
  };
}

function PresentShell({
  label,
  current,
  total,
  onClose,
  onPrev,
  onNext,
  children,
}: {
  label: string;
  current: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
}) {
  const { t } = useLang();
  const swipe = useFullscreenChrome(onClose, onPrev, onNext);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-parchment text-ink" {...swipe}>
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {label} · {t('primer.slideOf', { current: String(current), total: String(total) })}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink/20 bg-white/70 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white touch-target"
        >
          <X className="h-4 w-4" />
          {t('primer.close')}
        </button>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="flex flex-1 cursor-pointer items-center justify-center px-4 py-2 text-left sm:px-10"
        aria-label={t('primer.next')}
      >
        <div className="w-full max-w-4xl">{children}</div>
      </button>

      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white/70 px-4 py-3 text-sm font-bold text-ink transition hover:bg-white touch-target"
        >
          <ChevronLeft className="h-5 w-5" />
          {t('primer.prev')}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-terracotta/50 bg-terracotta/10 px-5 py-3 text-sm font-bold text-terracotta transition hover:bg-terracotta/20 touch-target"
        >
          {t('primer.next')}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

type Block = 'word' | 'meaning' | 'clue';

function buildBlocks(card: WordCard, leadFace: 'word' | 'definition'): Block[] {
  const base: Block[] = leadFace === 'word' ? ['word', 'meaning'] : ['meaning', 'word'];
  if (card.clue) base.push('clue');
  return base;
}

export function WordDeckPresent({
  cards,
  transition,
  leadFace,
  onClose,
}: {
  cards: WordCard[];
  transition: Transition;
  leadFace: 'word' | 'definition';
  onClose: () => void;
}) {
  const { t } = useLang();
  const hasTip = Boolean(transition.teacherLineEnglish);
  const totalSlides = cards.length + (hasTip ? 1 : 0);
  const [slide, setSlide] = useState(0);
  const [revealed, setRevealed] = useState(1);

  const isTipSlide = hasTip && slide === cards.length;
  const blocks = useMemo(
    () => (isTipSlide || !cards[slide] ? [] : buildBlocks(cards[slide], leadFace)),
    [isTipSlide, cards, slide, leadFace],
  );
  const maxReveal = isTipSlide ? 1 : blocks.length;

  const goPrev = () => {
    if (slide > 0) {
      const prev = slide - 1;
      setSlide(prev);
      setRevealed(prev === cards.length ? 1 : buildBlocks(cards[prev], leadFace).length);
    }
  };

  const goNext = () => {
    if (revealed < maxReveal) {
      setRevealed((r) => r + 1);
    } else if (slide < totalSlides - 1) {
      setSlide((s) => s + 1);
      setRevealed(1);
    }
  };

  if (totalSlides === 0) return null;

  return (
    <PresentShell
      label={t('coach.tab.primer')}
      current={slide + 1}
      total={totalSlides}
      onClose={onClose}
      onPrev={goPrev}
      onNext={goNext}
    >
      {isTipSlide ? (
        <div className="text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-terracotta">
            {t('primer.teachingTip')}
          </p>
          {transition.talkMoveName ? (
            <p className="mb-4 text-lg font-bold text-ink-muted">{transition.talkMoveName}</p>
          ) : null}
          <p className="text-3xl font-bold leading-snug text-ink sm:text-5xl">
            {transition.teacherLineEnglish}
          </p>
          {transition.teacherLineBridge ? (
            <p className="mt-5 text-2xl italic leading-snug text-ink-soft sm:text-3xl">
              {transition.teacherLineBridge}
            </p>
          ) : null}
          {transition.sentenceFrames.length > 0 ? (
            <ul className="mx-auto mt-8 max-w-2xl space-y-3">
              {transition.sentenceFrames.map((frame, idx) => (
                <li
                  key={`frame-${idx}`}
                  className="rounded-xl border-2 border-ink/15 bg-white/60 px-5 py-3 text-xl text-ink-soft sm:text-2xl"
                >
                  {frame}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="text-center">
          {blocks.slice(0, revealed).map((block) => {
            const card = cards[slide];
            if (block === 'word') {
              return (
                <p
                  key="word"
                  className="mb-5 text-5xl font-extrabold uppercase tracking-wide text-ink sm:text-7xl"
                >
                  {card.word}
                </p>
              );
            }
            if (block === 'meaning') {
              return (
                <div key="meaning" className="mb-5">
                  <p className="text-2xl leading-snug text-ink-soft sm:text-4xl">{card.kidDefinition}</p>
                  {card.bridgeWord ? (
                    <p className="mt-4 inline-block rounded-full border-2 border-terracotta/40 bg-terracotta/10 px-5 py-2 text-2xl font-bold text-terracotta sm:text-3xl">
                      {card.bridgeWord}
                    </p>
                  ) : null}
                </div>
              );
            }
            return (
              <p key="clue" className="mt-4 text-xl italic text-ink-muted sm:text-2xl">
                {card.clue}
              </p>
            );
          })}
          {revealed < maxReveal ? (
            <p className="mt-10 text-sm font-semibold uppercase tracking-wide text-ink-muted/70">
              {t('primer.tapToReveal')}
            </p>
          ) : null}
        </div>
      )}
    </PresentShell>
  );
}

export function BingoPresent({ grids, onClose }: { grids: string[][]; onClose: () => void }) {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  const goPrev = () => setIndex((i) => (i > 0 ? i - 1 : i));
  const goNext = () => setIndex((i) => (i < grids.length - 1 ? i + 1 : i));

  if (grids.length === 0) return null;
  const grid = grids[index];

  return (
    <PresentShell
      label={t('primer.bingoCard', { n: String(index + 1) })}
      current={index + 1}
      total={grids.length}
      onClose={onClose}
      onPrev={goPrev}
      onNext={goNext}
    >
      <div className="mx-auto grid w-full max-w-2xl grid-cols-3 gap-2 sm:gap-3">
        {grid.map((word, cell) => (
          <div
            key={`cell-${cell}`}
            className="flex aspect-square items-center justify-center rounded-xl border-2 border-ink/30 bg-white/70 p-2 text-center text-lg font-bold text-ink sm:text-3xl"
          >
            {word}
          </div>
        ))}
      </div>
    </PresentShell>
  );
}
