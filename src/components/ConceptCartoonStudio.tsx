/**
 * Concept Cartoon Studio (POST /api/concept-cartoon) — the Sprint 1 Week 8–9 and Sprint 2
 * pair-inquiry provocation tool.
 *
 * - Fixed cast Ali / Bisi / Cempaka; the server randomises who is sound / misconception /
 *   language trap on every generation, and "Shuffle" re-rolls it in the browser.
 * - Speech bubbles are live HTML text in a code-drawn SVG layout: inline editable, printable,
 *   never rasterised AI text.
 * - Zero personal data: topic, focus, and the cartoon live in React state only (never
 *   localStorage) and the endpoint is stateless.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  LoaderCircle,
  MonitorPlay,
  Pencil,
  Printer,
  ShieldCheck,
  Shuffle,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useLang, type TranslateFn } from '../lib/i18n';
import { useClassContext } from '../lib/class-context';
import { useActiveStrategy } from '../lib/strategy-context';
import { getStrategy } from '../lib/core6-strategies';
import type { LiveCoachHandoff } from '../lib/coach-handoff';
import {
  CARTOON_MAX_BUBBLE_WORDS,
  bubbleMentionsCast,
  countWords,
  normalizeCartoonPlan,
  shuffleCast,
  type CartoonClaim,
  type CartoonClaimType,
  type ConceptCartoonPlan,
} from '../lib/concept-cartoon';
import {
  AiNotice,
  CollapsibleFormShell,
  CopyButton,
  LanguageLensToggle,
  PrivacyNotice,
  StartNewButton,
  StrategySpotlightBadge,
  type LangLens,
} from './coach-ui';
import StrategyBar from './StrategyBar';
import { FaceSvg, getCartoonCastStyle } from './StudentAvatar';

const CLAIM_TYPE_TONE: Record<CartoonClaimType, string> = {
  sound: 'border-sage bg-sage text-white',
  misconception: 'border-amber bg-amber text-white',
  language_trap: 'border-berry bg-berry text-white',
};

/** Inserts `text` as a plain text node at the caret (keeps pasted HTML out of the bubble). */
function insertPlainText(text: string): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  if (!range) return false;
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function flattenEditableText(text: string): string {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
}

const EDITABLE_BASE =
  'editable-text min-h-[44px] w-full cursor-text whitespace-pre-wrap rounded-xl px-2 py-1 text-left text-base font-semibold leading-snug text-ink outline-none transition focus:bg-parchment-light focus:ring-2 focus:ring-terracotta/30';

/**
 * In-place editable text. React never renders children here: the DOM owns the text while the
 * teacher is typing (so the caret never jumps) and is re-synced from `value` only when blurred.
 */
function EditableText({
  value,
  onChange,
  ariaLabel,
  placeholder,
  tone = 'bubble',
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder: string;
  tone?: 'bubble' | 'bridge';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || editingRef.current) return;
    if (element.innerText !== value) element.innerText = value;
  }, [value]);

  const accent =
    tone === 'bubble'
      ? 'border-2 border-transparent hover:border-terracotta/40 focus:border-terracotta/60'
      : 'border-2 border-transparent hover:border-sky/40 focus:border-sky/60';

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      className={`${EDITABLE_BASE} ${accent}`}
      onFocus={() => {
        editingRef.current = true;
      }}
      onBlur={() => {
        editingRef.current = false;
        if (ref.current) onChange(flattenEditableText(ref.current.innerText));
      }}
      onInput={(event) => onChange(event.currentTarget.innerText)}
      onKeyDown={(event) => {
        // Bubbles are single short sentences; Enter would only add stray line breaks.
        if (event.key === 'Enter') event.preventDefault();
        else if (event.key === 'Escape') event.currentTarget.blur();
      }}
      onPaste={(event) => {
        event.preventDefault();
        if (insertPlainText(event.clipboardData.getData('text/plain'))) {
          onChange(event.currentTarget.innerText);
        }
      }}
      onDrop={(event) => event.preventDefault()}
    />
  );
}

function IbanStatusChip({ claim, onMarkChecked, t }: { claim: CartoonClaim; onMarkChecked: () => void; t: TranslateFn }) {
  const checked = claim.ibanChecked === true;
  if (!claim.bridge.ibanNeedsTeacherCheck && !checked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-ink/15 bg-white px-2 py-0.5 font-display text-[11px] font-semibold text-ink-muted">
        <ShieldCheck className="h-3 w-3" aria-hidden />
        {t('studio.ibanOk')}
      </span>
    );
  }
  if (checked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sage/40 bg-sage-bg px-2 py-0.5 font-display text-[11px] font-bold text-[#1f6b4a]">
        <Check className="h-3 w-3" aria-hidden />
        {t('studio.checkedByTeacher')}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border border-amber/50 bg-amber-bg px-2 py-0.5 font-display text-[11px] font-bold text-[#9e5f06]">
        <TriangleAlert className="h-3 w-3" aria-hidden />
        {t('studio.ibanCheck')}
      </span>
      <button
        type="button"
        onClick={onMarkChecked}
        className="rounded-full border-2 border-sage/40 bg-white px-2 py-0.5 font-display text-[11px] font-bold text-[#1f6b4a] transition hover:bg-sage-bg touch-target"
      >
        {t('studio.markChecked')}
      </button>
    </span>
  );
}

function ClaimColumn({
  claim,
  editable,
  showEn,
  showL1,
  teacherKey,
  large = false,
  onChange,
  t,
}: {
  claim: CartoonClaim;
  editable: boolean;
  showEn: boolean;
  showL1: boolean;
  /** Show the teacher-only diagnostic key and notes (hidden when presenting and printing). */
  teacherKey: boolean;
  large?: boolean;
  onChange?: (claim: CartoonClaim) => void;
  t: TranslateFn;
}) {
  const style = getCartoonCastStyle(claim.character);
  const wordCount = countWords(claim.english);
  const overLimit = editable && wordCount > CARTOON_MAX_BUBBLE_WORDS;
  const nameWarning = editable && bubbleMentionsCast(claim.english);
  const bubbleText = large ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';

  return (
    <div className="flex flex-col items-center">
      {/* Code-drawn character (SVG) */}
      <div className="relative">
        <div
          className={`overflow-hidden rounded-3xl border-2 border-ink/15 shadow-[0_3px_0_rgba(39,34,32,0.12)] ${
            large ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-24 w-24 sm:h-28 sm:w-28'
          }`}
          style={{ backgroundColor: style.accent }}
        >
          <FaceSvg style={style} mood="engaged" isSpeaking={false} className="h-full w-full" />
        </div>
        {teacherKey ? (
          <span
            className={`absolute -right-3 -top-2 whitespace-nowrap rounded-full border-2 px-2 py-0.5 font-display text-[11px] font-bold shadow-sm print:hidden ${CLAIM_TYPE_TONE[claim.type]}`}
          >
            {t(`studio.claimType.${claim.type}`)}
          </span>
        ) : null}
      </div>
      <div className="-mt-3 rounded-xl border-2 border-ink/70 bg-parchment-light px-4 py-1 font-display text-base font-bold text-ink shadow-[0_2px_0_rgba(39,34,32,0.25)]">
        {claim.character}
      </div>

      {/* Speech bubble — inline editable text, never rasterised */}
      {showEn ? (
        <div className="relative mt-3 w-full rounded-2xl border-2 border-ink/15 bg-white p-3 shadow-[0_2px_0_rgba(39,34,32,0.08)]">
          <span
            className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-ink/15 bg-white"
            aria-hidden
          />
          {editable && onChange ? (
            <>
              <EditableText
                value={claim.english}
                onChange={(english) => onChange({ ...claim, english })}
                ariaLabel={`${claim.character} — English`}
                placeholder="…"
              />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-ink/10 pt-1.5 text-[11px] font-bold print:hidden">
                <span className={overLimit ? 'text-[#b2401f]' : 'text-ink-muted'}>
                  {t('studio.wordCount', { count: String(wordCount) })}
                </span>
                {overLimit ? (
                  <span className="text-[#b2401f]">{t('studio.overLimit')}</span>
                ) : nameWarning ? (
                  <span className="text-[#b2401f]">{t('studio.castNameWarning')}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-ink-muted">
                    <Pencil className="h-3 w-3" aria-hidden />
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className={`${bubbleText} font-bold leading-snug text-ink`}>{claim.english}</p>
          )}
        </div>
      ) : null}

      {/* L1 conceptual bridge */}
      {showL1 ? (
        <div className="mt-2.5 w-full space-y-2 rounded-2xl border-2 border-sky/25 bg-sky-bg/60 p-3">
          <p className="label-section">{t('studio.bridges')}</p>
          {editable && onChange ? (
            <>
              <EditableText
                value={claim.bridge.iban}
                onChange={(iban) => onChange({ ...claim, bridge: { ...claim.bridge, iban } })}
                ariaLabel={`${claim.character} — Iban`}
                placeholder="Iban…"
                tone="bridge"
              />
              <div className="flex flex-wrap items-center gap-1.5 print:hidden">
                <IbanStatusChip
                  claim={claim}
                  onMarkChecked={() => onChange({ ...claim, ibanChecked: true })}
                  t={t}
                />
              </div>
              <EditableText
                value={claim.bridge.sarawakMalay}
                onChange={(sarawakMalay) =>
                  onChange({ ...claim, bridge: { ...claim.bridge, sarawakMalay } })
                }
                ariaLabel={`${claim.character} — Sarawak Malay`}
                placeholder="Sarawak Malay…"
                tone="bridge"
              />
            </>
          ) : (
            <>
              {claim.bridge.iban ? (
                <p className={`${large ? 'text-base' : 'text-sm'} font-semibold italic leading-snug text-ink-soft`}>
                  {claim.bridge.iban}
                </p>
              ) : null}
              {claim.bridge.sarawakMalay ? (
                <p className={`${large ? 'text-base' : 'text-sm'} font-semibold italic leading-snug text-ink-soft`}>
                  {claim.bridge.sarawakMalay}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {/* Teacher-only note: never shown to the class, never printed */}
      {teacherKey && claim.teacherNote ? (
        <div className="mt-2 w-full rounded-2xl border-2 border-ink/10 bg-parchment-light px-3 py-2 print:hidden">
          <p className="label-section">{t('studio.teacherNote')}</p>
          <p className="mt-0.5 text-xs font-semibold leading-snug text-ink-soft">{claim.teacherNote}</p>
        </div>
      ) : null}
    </div>
  );
}

function CartoonSheet({
  cartoon,
  strategyId,
  showEn,
  showL1,
  editable,
  onClaimChange,
  onStemChange,
  onWhatIfChange,
  t,
}: {
  cartoon: ConceptCartoonPlan;
  strategyId: string;
  showEn: boolean;
  showL1: boolean;
  editable: boolean;
  onClaimChange: (claim: CartoonClaim) => void;
  onStemChange: (index: number, value: string) => void;
  onWhatIfChange: (patch: Partial<ConceptCartoonPlan['whatIfQuestion']>) => void;
  t: TranslateFn;
}) {
  return (
    <article className="studio-sheet card-warm space-y-4 p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b-2 border-ink/10 pb-3">
        <div className="min-w-0 flex-1">
          <p className="label-section">{t('studio.title')}</p>
          <h2 className="card-title mt-0.5">{cartoon.topic}</h2>
        </div>
        <StrategySpotlightBadge strategyId={strategyId} />
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-3">
        {cartoon.claims.map((claim) => (
          <ClaimColumn
            key={claim.id}
            claim={claim}
            editable={editable}
            showEn={showEn}
            showL1={showL1}
            teacherKey={editable}
            onChange={(next) => onClaimChange(next)}
            t={t}
          />
        ))}
      </div>

      <section className="rounded-2xl border-2 border-terracotta/35 bg-terracotta-bg/60 p-3.5">
        <p className="label-section mb-1.5">{t('studio.whatIf')}</p>
        {showEn ? (
          editable ? (
            <EditableText
              value={cartoon.whatIfQuestion.english}
              onChange={(english) => onWhatIfChange({ english })}
              ariaLabel={t('studio.whatIf')}
              placeholder="What if we changed ___?"
            />
          ) : (
            <p className="text-base font-bold leading-snug text-ink">{cartoon.whatIfQuestion.english}</p>
          )
        ) : null}
        {showL1 && (editable || cartoon.whatIfQuestion.bridge) ? (
          editable ? (
            <EditableText
              value={cartoon.whatIfQuestion.bridge}
              onChange={(bridge) => onWhatIfChange({ bridge })}
              ariaLabel={`${t('studio.whatIf')} — Iban`}
              placeholder="Iban…"
              tone="bridge"
            />
          ) : (
            <p className="mt-1.5 border-t border-terracotta/20 pt-1.5 text-sm font-semibold italic leading-snug text-ink-soft">
              {cartoon.whatIfQuestion.bridge}
            </p>
          )
        ) : null}
      </section>

      {cartoon.sentenceStems.length > 0 ? (
        <section>
          <p className="label-section mb-2">{t('studio.stems')}</p>
          <ul className="space-y-1.5">
            {cartoon.sentenceStems.map((stem, index) => (
              <li
                key={index}
                className="flex items-start justify-between gap-2 rounded-xl border-2 border-ink/10 bg-white px-1 py-0.5 text-sm font-semibold text-ink"
              >
                {editable ? (
                  <EditableText
                    value={stem}
                    onChange={(value) => onStemChange(index, value)}
                    ariaLabel={`${t('studio.stems')} ${index + 1}`}
                    placeholder="___"
                  />
                ) : (
                  <span className="flex-1 px-3 py-1.5">{stem}</span>
                )}
                <span className="py-1 pr-1.5 print:hidden">
                  <CopyButton value={stem} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function CartoonPresent({
  cartoon,
  showEn,
  showL1,
  t,
  onClose,
}: {
  cartoon: ConceptCartoonPlan;
  showEn: boolean;
  showL1: boolean;
  t: TranslateFn;
  onClose: () => void;
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-parchment p-4 text-ink sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 pb-3">
        <h2 className="min-w-0 card-title">{cartoon.topic}</h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3.5 py-2 font-display text-xs font-bold text-ink touch-target"
        >
          <X className="h-4 w-4" />
          {t('primer.close')}
        </button>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-4">
        <div className="rounded-3xl border-2 border-terracotta/40 bg-white px-5 py-4 text-center shadow-sm">
          <p className="font-display text-lg font-bold text-ink sm:text-2xl">{t('studio.launchPrompt')}</p>
        </div>

        {/* Teacher key (sound / misconception / language trap) is never shown here. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {cartoon.claims.map((claim) => (
            <ClaimColumn
              key={claim.id}
              claim={claim}
              editable={false}
              showEn={showEn}
              showL1={showL1}
              teacherKey={false}
              large
              t={t}
            />
          ))}
        </div>

        <details className="rounded-2xl border-2 border-terracotta/40 bg-terracotta-bg px-5 py-3 text-center">
          <summary className="cursor-pointer list-none font-display text-base font-bold text-terracotta touch-target [&::-webkit-details-marker]:hidden sm:text-xl">
            {t('studio.whatIf')}
          </summary>
          <div className="mt-2 text-left">
            {showEn ? <p className="text-base font-bold leading-snug text-ink">{cartoon.whatIfQuestion.english}</p> : null}
            {showL1 && cartoon.whatIfQuestion.bridge ? (
              <p className="mt-1 text-sm font-semibold italic text-ink-soft">{cartoon.whatIfQuestion.bridge}</p>
            ) : null}
          </div>
        </details>

        {cartoon.sentenceStems.length > 0 ? (
          <div className="rounded-2xl border-2 border-sky/30 bg-sky-bg/60 px-4 py-3">
            <p className="label-section mb-1.5">{t('studio.stems')}</p>
            <ul className="space-y-1">
              {cartoon.sentenceStems.map((stem, index) => (
                <li key={`${index}-${stem}`} className="text-sm font-bold text-ink">
                  {stem}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <AiNotice />
      </div>
    </div>
  );
}

export default function ConceptCartoonStudio({
  onOpenLiveCoach,
}: {
  onOpenLiveCoach: (handoff: LiveCoachHandoff) => void;
}) {
  const { t } = useLang();
  const { yearLevel, subject, dominantLanguage } = useClassContext();
  const { activeStrategy } = useActiveStrategy();
  // Zero personal data: React state only. Topic, focus, and the cartoon are never persisted.
  const [topic, setTopic] = useState('');
  const [teacherFocus, setTeacherFocus] = useState('');
  const [cartoon, setCartoon] = useState<ConceptCartoonPlan | null>(null);
  const [strategyUsed, setStrategyUsed] = useState('');
  const [generation, setGeneration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [langLens, setLangLens] = useState<LangLens>('both');

  const showEn = langLens === 'both' || langLens === 'en';
  const showL1 = langLens === 'both' || langLens === 'l1';

  const clearAll = () => {
    setTopic('');
    setTeacherFocus('');
    setCartoon(null);
    setStrategyUsed('');
    setFormCollapsed(false);
    setPresenting(false);
    setError(null);
  };

  const requestCartoon = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/concept-cartoon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          teacherFocus,
          yearLevel,
          subject,
          dominantLanguage,
          activeStrategy,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || t('studio.errors.failed'));
      }
      setCartoon(normalizeCartoonPlan(payload?.plan));
      setStrategyUsed(payload?.meta?.strategy?.id || activeStrategy);
      setGeneration((current) => current + 1);
      setFormCollapsed(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('studio.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (topic.trim().length < 3) {
      setError(t('studio.errors.topicRequired'));
      return;
    }
    void requestCartoon();
  };

  const updateClaim = (next: CartoonClaim) => {
    setCartoon((current) =>
      current
        ? { ...current, claims: current.claims.map((claim) => (claim.id === next.id ? next : claim)) }
        : current,
    );
  };

  const followUpChips = cartoon?.followUpChips ?? [];
  const warnings = cartoon?.warnings ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="heading-editorial">{t('studio.title')}</h1>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-ink-muted">{t('studio.tagline')}</p>
        </div>
        {cartoon ? <StartNewButton onClear={clearAll} /> : null}
      </div>

      <StrategyBar />

      <CollapsibleFormShell
        collapsed={Boolean(cartoon) && formCollapsed}
        onToggle={() => setFormCollapsed((collapsed) => !collapsed)}
        summary={cartoon ? t('studio.summary', { topic: cartoon.topic }) : ''}
      >
        <form onSubmit={handleGenerate} className="card-warm p-5 sm:p-6">
          <p className="mb-3 text-sm leading-snug text-ink-soft">{t('studio.intro')}</p>
          <label className="block">
            <span className="mb-1.5 block font-display text-sm font-bold text-ink">
              {t('studio.topicLabel')}
            </span>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              rows={3}
              className="w-full rounded-2xl border-2 border-ink/20 bg-white px-4 py-3 text-lg font-semibold text-ink outline-none transition focus:border-terracotta/70 focus:ring-2 focus:ring-terracotta/20"
              placeholder={t('studio.topicPlaceholder')}
            />
          </label>

          <details className="mt-3 rounded-xl border border-ink/10 bg-parchment-light/70 px-3 py-2">
            <summary className="cursor-pointer font-display text-xs font-semibold text-ink-muted">
              {t('studio.focusLabel')}
            </summary>
            <input
              value={teacherFocus}
              onChange={(event) => setTeacherFocus(event.target.value)}
              className="mt-2 min-h-[44px] w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-terracotta/60"
              placeholder={t('studio.focusPlaceholder')}
            />
          </details>

          <div className="mt-3">
            <PrivacyNotice compact />
          </div>

          {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 touch-target disabled:opacity-70 sm:w-auto"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? t('studio.generating') : t('studio.generate')}
          </button>
        </form>
      </CollapsibleFormShell>

      {cartoon ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3.5"
        >
          {/* Scientific-accuracy reminder for teacher / pair review before class display */}
          <section className="flex items-start gap-2 rounded-2xl border-2 border-amber/40 bg-amber-bg px-3.5 py-2.5 print:hidden">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#9e5f06]" aria-hidden />
            <div className="text-xs font-bold leading-snug text-[#7c4902]">
              <p>{t('studio.accuracyReminder')}</p>
              <p className="mt-1 font-semibold">{t('studio.editHint')}</p>
            </div>
          </section>

          {warnings.length > 0 ? (
            <section className="rounded-2xl border-2 border-red-300 bg-red-50 px-3.5 py-2.5 print:hidden">
              <p className="label-section mb-1 text-red-700">{t('studio.warningsTitle')}</p>
              <ul className="list-disc space-y-0.5 pl-4 text-xs font-bold text-red-700">
                {warnings.map((warning, index) => (
                  <li key={`${index}-${warning}`}>{warning}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <LanguageLensToggle value={langLens} onChange={setLangLens} />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCartoon((current) => (current ? { ...current, claims: shuffleCast(current.claims) } : current))}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 font-display text-xs font-semibold text-ink transition hover:border-ink/30 touch-target"
              >
                <Shuffle className="h-4 w-4" />
                {t('studio.shuffle')}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void requestCartoon()}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 font-display text-xs font-semibold text-ink transition hover:border-ink/30 touch-target disabled:opacity-70"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t('studio.regenerate')}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 font-display text-xs font-semibold text-ink transition hover:border-ink/30 touch-target"
              >
                <Printer className="h-4 w-4" />
                {t('studio.print')}
              </button>
              <button
                type="button"
                onClick={() => setPresenting(true)}
                className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm touch-target"
              >
                <MonitorPlay className="h-4 w-4" />
                {t('studio.present')}
              </button>
            </div>
          </div>

          <CartoonSheet
            key={generation}
            cartoon={cartoon}
            strategyId={strategyUsed}
            showEn={showEn}
            showL1={showL1}
            editable
            onClaimChange={updateClaim}
            onStemChange={(index, value) =>
              setCartoon((current) =>
                current
                  ? {
                      ...current,
                      sentenceStems: current.sentenceStems.map((stem, stemIndex) =>
                        stemIndex === index ? value : stem,
                      ),
                    }
                  : current,
              )
            }
            onWhatIfChange={(patch) =>
              setCartoon((current) =>
                current
                  ? {
                      ...current,
                      whatIfQuestion: {
                        english: patch.english !== undefined ? patch.english : current.whatIfQuestion.english,
                        bridge: patch.bridge !== undefined ? patch.bridge : current.whatIfQuestion.bridge,
                      },
                    }
                  : current,
              )
            }
            t={t}
          />

          {followUpChips.length > 0 ? (
            <section className="rounded-2xl border-2 border-terracotta/30 bg-terracotta-bg/50 p-3.5 print:hidden">
              <p className="label-section mb-1 text-terracotta">{t('studio.followUpTitle')}</p>
              <p className="mb-2.5 text-xs font-semibold text-ink-soft">{t('studio.followUpHint')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {followUpChips.map((chip) => {
                  const target = getStrategy(chip.targetStrategy);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() =>
                        onOpenLiveCoach({
                          source: 'concept-cartoon',
                          promptContext: chip.promptContext,
                          actionTrigger: chip.nextActionMode,
                          targetStrategy: chip.targetStrategy,
                        })
                      }
                      className="flex flex-col items-start gap-1.5 rounded-xl border-2 border-terracotta/30 bg-white px-3 py-2.5 text-left text-xs font-bold text-ink transition hover:border-terracotta touch-target"
                    >
                      <span>{chip.label}</span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {target ? <span className="pill-terracotta">{target.id} · {target.shortName}</span> : null}
                        <span className="pill-amber">{t(`live.mode.${chip.nextActionMode}`)}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-terracotta" aria-hidden />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <AiNotice />
        </motion.div>
      ) : null}

      {presenting && cartoon ? (
        <CartoonPresent
          cartoon={cartoon}
          showEn={showEn}
          showL1={showL1}
          t={t}
          onClose={() => setPresenting(false)}
        />
      ) : null}
    </div>
  );
}
