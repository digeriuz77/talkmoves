// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, MonitorPlay, TriangleAlert, X } from 'lucide-react';
import type { ConceptCartoon, ConceptCartoonClaim } from '../data/curriculum';
import { useLang } from '../lib/i18n';
import { CopyButton, type LangLens } from './coach-ui';
import { StudentFaceBadge } from './StudentAvatar';

const CLAIM_COLORS = [
  'border-terracotta/40 bg-terracotta-bg/50',
  'border-amber/45 bg-amber-bg/60',
  'border-sky/40 bg-sky-bg/60',
  'border-berry/40 bg-berry-bg/60',
];

function ClaimBubble({
  claim,
  index,
  selected,
  onSelect,
  showEn,
  showL1,
  large = false,
}: {
  claim: ConceptCartoonClaim;
  index: number;
  selected: boolean;
  onSelect: () => void;
  showEn: boolean;
  showL1: boolean;
  large?: boolean;
}) {
  const tone = CLAIM_COLORS[index % CLAIM_COLORS.length];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col rounded-3xl border-2 p-3.5 text-left transition touch-target sm:p-4 ${tone} ${
        selected
          ? 'ring-4 ring-terracotta/30 shadow-md scale-[1.01]'
          : 'hover:border-ink/35'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-display text-xs font-bold text-white">
            {index + 1}
          </span>
          <StudentFaceBadge
            studentId={claim.studentId}
            name={claim.studentName}
            isSpeaking={selected}
            mood="engaged"
          />
        </div>
      </div>

      <div className="rounded-2xl border-2 border-ink/12 bg-white px-3.5 py-3 shadow-[0_2px_0_rgba(39,34,32,0.08)]">
        {showEn ? (
          <p className={`${large ? 'text-lg sm:text-2xl' : 'text-sm sm:text-base'} font-bold leading-snug text-ink`}>
            “{claim.claimEn}”
          </p>
        ) : null}
        {showL1 && claim.claimBridge ? (
          <p
            className={`${showEn ? 'mt-1.5 border-t border-ink/10 pt-1.5' : ''} ${
              large ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'
            } font-semibold italic text-ink-soft`}
          >
            “{claim.claimBridge}”
          </p>
        ) : null}
      </div>
    </button>
  );
}

export function ConceptCartoonCard({
  cartoon,
  langLens,
}: {
  cartoon: ConceptCartoon;
  langLens: LangLens;
}) {
  const { t } = useLang();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [presenting, setPresenting] = useState(false);

  const showEn = langLens === 'both' || langLens === 'en';
  const showL1 = langLens === 'both' || langLens === 'l1';

  return (
    <article className="card-warm space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="pill-sky">KPM {cartoon.kpmStandard}</span>
            <span className="pill-amber inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" aria-hidden />
              {cartoon.textbookPage}
            </span>
          </div>
          <h3 className="card-title">{cartoon.title}</h3>
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

      {/* Central Textbook Stimulus Cue */}
      <div className="rounded-2xl border-2 border-ink/12 bg-parchment/70 px-4 py-3">
        {showEn ? <p className="text-sm font-bold text-ink">{cartoon.stimulusPromptEn}</p> : null}
        {showL1 && cartoon.stimulusPromptBridge ? (
          <p className={`${showEn ? 'mt-1' : ''} text-xs font-semibold italic text-ink-soft`}>
            {cartoon.stimulusPromptBridge}
          </p>
        ) : null}
      </div>

      {/* Competing Pupil Claims Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cartoon.claims.map((claim, idx) => (
          <ClaimBubble
            key={`${cartoon.id}-${claim.studentId}`}
            claim={claim}
            index={idx}
            selected={selectedIdx === idx}
            onSelect={() => setSelectedIdx((cur) => (cur === idx ? null : idx))}
            showEn={showEn}
            showL1={showL1}
          />
        ))}
      </div>

      {/* Teacher-only Diagnostic Key & Talk Move Prompt (collapsible, hidden during projection) */}
      <details className="group rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 print:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-display text-sm font-bold text-ink [&::-webkit-details-marker]:hidden touch-target">
          <span>{t('vocab.teacherNotes')}</span>
          <ChevronDown className="h-4 w-4 text-ink-muted transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-3 space-y-3 border-t border-ink/10 pt-3">
          <div className="rounded-2xl border-2 border-terracotta/30 bg-terracotta-bg/50 p-3">
            <p className="label-section mb-1 text-terracotta">{t('vocab.launchTalkMove')}</p>
            {showEn ? <p className="text-sm font-bold text-ink">{cartoon.talkMovePromptEn}</p> : null}
            {showL1 && cartoon.talkMovePromptBridge ? (
              <p className="mt-1 text-xs font-semibold italic text-ink-soft">{cartoon.talkMovePromptBridge}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            {cartoon.claims.map((claim, idx) => {
              const isTarget = claim.diagnosticTag === 'target';
              return (
                <div
                  key={`diag-${claim.studentId}`}
                  className={`rounded-2xl border-2 px-3.5 py-2.5 text-xs ${
                    isTarget
                      ? 'border-sage/40 bg-sage-bg/50'
                      : 'border-amber/35 bg-amber-bg/45'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-1.5 font-display text-xs font-bold">
                    {isTarget ? (
                      <CheckCircle2 className="h-4 w-4 text-sage" />
                    ) : (
                      <TriangleAlert className="h-4 w-4 text-amber" />
                    )}
                    <span className="text-ink">
                      {idx + 1}. {claim.studentName}
                    </span>
                    <span className={isTarget ? 'pill-sage' : 'pill-amber'}>
                      {isTarget ? t('vocab.tagTarget') : t('vocab.tagMisconception')}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-ink-soft">{claim.explanation}</p>
                </div>
              );
            })}
          </div>

          {cartoon.sentenceFrames.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-muted">
                {t('lesson.frames')}
              </p>
              <ul className="space-y-1.5">
                {cartoon.sentenceFrames.map((frame, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-2 rounded-xl border border-ink/12 bg-parchment-light px-3 py-2 text-sm font-semibold text-ink"
                  >
                    <span className="flex-1">{frame}</span>
                    <CopyButton value={frame} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </details>

      {presenting ? (
        <ConceptCartoonPresent
          cartoon={cartoon}
          showEn={showEn}
          showL1={showL1}
          onClose={() => setPresenting(false)}
        />
      ) : null}
    </article>
  );
}

function ConceptCartoonPresent({
  cartoon,
  showEn,
  showL1,
  onClose,
}: {
  cartoon: ConceptCartoon;
  showEn: boolean;
  showL1: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [spotlight, setSpotlight] = useState<number | null>(null);

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
    <div className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-parchment p-4 text-ink sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill-sky">KPM {cartoon.kpmStandard}</span>
          <span className="pill-amber">{cartoon.textbookPage}</span>
          <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">{cartoon.title}</h2>
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

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-4">
        <div className="rounded-3xl border-2 border-ink/15 bg-white px-5 py-4 text-center shadow-sm">
          {showEn ? (
            <p className="font-display text-lg font-bold text-ink sm:text-2xl">
              {cartoon.stimulusPromptEn}
            </p>
          ) : null}
          {showL1 && cartoon.stimulusPromptBridge ? (
            <p className="mt-1 text-base font-semibold italic text-ink-soft sm:text-lg">
              {cartoon.stimulusPromptBridge}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cartoon.claims.map((claim, idx) => (
            <ClaimBubble
              key={`present-${claim.studentId}`}
              claim={claim}
              index={idx}
              selected={spotlight === idx}
              onSelect={() => setSpotlight((cur) => (cur === idx ? null : idx))}
              showEn={showEn}
              showL1={showL1}
              large
            />
          ))}
        </div>

        <div className="rounded-2xl border-2 border-terracotta/40 bg-terracotta-bg px-5 py-3 text-center">
          <p className="font-display text-base font-bold text-terracotta sm:text-xl">
            {showEn ? cartoon.talkMovePromptEn : cartoon.talkMovePromptBridge}
          </p>
        </div>
      </div>
    </div>
  );
}
