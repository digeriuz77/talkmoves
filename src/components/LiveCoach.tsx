import { FormEvent, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Lightbulb,
  LoaderCircle,
  Send,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useLang, type TranslateFn } from '../lib/i18n';
import { usePersistentState } from '../lib/usePersistentState';
import {
  CopyButton,
  NeedBadge,
  SayLine,
  SelectField,
  StartNewButton,
  languages,
  subjectLabel,
  subjects,
  yearLevels,
  type NeedCategory,
} from './coach-ui';

type ActionMode = 'diagnose' | 'reset' | 'firm_up';

type Idea = {
  kind: 'alternative-move' | 'root-cause' | 'missed-angle' | 'risk' | 'beyond-palette';
  headline: string;
  detail: string;
  talkMoveId: string;
  offPalette?: boolean;
  sayNowEnglish: string;
  sayNowBridge: string;
};

type LiveCoachResult = {
  actionMode: ActionMode;
  readBack: {
    detectedLanguage: string;
    needCategory: NeedCategory;
    summaryEnglish: string;
    summaryBridge: string;
  };
  diagnosis?: {
    barrier: string;
    confidence: number;
    evidence: string;
  };
  teacherMirror?: string;
  rationaleNote?: string;
  observeNext?: string;
  ideas?: Idea[];
  diagnose?: {
    hypothesis: string;
    clarifyingQuestion: string;
    clarifyingOptions: string[];
  };
  reset?: {
    eefPrinciple: {
      principleId: string;
      principle: string;
      whyThisFits: string;
      checkAdaptAction: string;
    };
    resetActionSteps: string[];
  };
  firmUp?: {
    eefRationale: string;
    talkMove: {
      talkMoveId: string;
      offPalette?: boolean;
      talkMoveName: string;
      why: string;
      sayNowEnglish: string;
      sayNowBridge: string;
    };
    bilingualSentenceFrames: Array<{ en: string; bridge: string }>;
    phrasingTip?: {
      tipMalay: string;
      tipIban: string;
      whenToUse: string;
    };
  };
  regainFocusLine?: string;
  ifItFails?: string;
};

type ChatMessage =
  | { id: string; role: 'teacher'; text: string }
  | { id: string; role: 'coach'; text: string; result: LiveCoachResult };

const MODE_ICON: Record<ActionMode, typeof Lightbulb> = {
  diagnose: Stethoscope,
  reset: RefreshCw,
  firm_up: Sparkles,
};

export default function LiveCoach() {
  const { t } = useLang();
  const [yearLevel, setYearLevel, resetYearLevel] = usePersistentState('tmb.live.yearLevel', '4');
  const [subject, setSubject, resetSubject] = usePersistentState('tmb.live.subject', 'science');
  const [dominantLanguage, setDominantLanguage, resetDominantLanguage] = usePersistentState(
    'tmb.live.dominantLanguage',
    'iban',
  );
  // v2: schema changed to the action_mode discriminated union; old results cannot render.
  const [messages, setMessages, resetMessages] = usePersistentState<ChatMessage[]>(
    'tmb.live.messages.v2',
    [],
  );
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  const clearTab = () => {
    resetYearLevel();
    resetSubject();
    resetDominantLanguage();
    resetMessages();
    setDraft('');
    setError(null);
  };

  const hasConversation = messages.length > 0;

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setError(null);

    const teacherMsg: ChatMessage = {
      id: `t-${Date.now()}`,
      role: 'teacher',
      text: clean,
    };
    const nextMessages = [...messages, teacherMsg];
    setMessages(nextMessages);
    setDraft('');
    setLoading(true);

    try {
      const response = await fetch('/api/live-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread: nextMessages.map((msg) =>
            msg.role === 'coach' ? { role: 'coach', text: msg.text } : { role: 'teacher', text: msg.text },
          ),
          yearLevel,
          subject,
          dominantLanguage,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || t('live.errors.failed'));
      }
      const result = payload.plan as LiveCoachResult;
      const coachText =
        result.teacherMirror || result.readBack.summaryEnglish || t('live.coachReplyFallback');
      const coachMsg: ChatMessage = {
        id: `c-${Date.now()}`,
        role: 'coach',
        text: coachText,
        result,
      };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (requestError) {
      setMessages((prev) => prev.filter((msg) => msg.id !== teacherMsg.id));
      setError(requestError instanceof Error ? requestError.message : t('live.errors.failed'));
    } finally {
      setLoading(false);
      draftRef.current?.focus();
    }
  };

  const fillDraftFromChip = (text: string) => {
    setDraft(text);
    draftRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(draft);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 print:hidden">
        <p className="max-w-xl text-xs text-ink-muted">{t('live.threadHint')}</p>
        <StartNewButton onClear={clearTab} />
      </div>

      <div className="card-warm p-4 sm:p-5 md:p-6 print:hidden">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      </div>

      {!hasConversation ? (
        <form onSubmit={handleSubmit} className="card-warm mt-3 p-4 sm:p-5 print:hidden">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t('live.observationLabel')}
            </span>
            <textarea
              ref={draftRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-24 w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
              placeholder={t('live.observationPlaceholder')}
            />
          </label>
          <p className="mt-1 text-xs text-ink-muted">{t('live.observationHint')}</p>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || !draft.trim()}
            className="btn-primary mt-4 inline-flex items-center gap-2 rounded-lg touch-target disabled:opacity-70"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {loading ? t('live.coaching') : t('live.coachMe')}
          </button>
        </form>
      ) : null}

      {hasConversation ? (
        <div ref={scrollRef} className="mt-3 max-h-[70vh] space-y-4 overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
          {messages.map((msg) =>
            msg.role === 'teacher' ? (
              <div key={msg.id}>
                <TeacherBubble text={msg.text} />
              </div>
            ) : (
              <div key={msg.id}>
                <CoachReply text={msg.text} result={msg.result} t={t} onChip={fillDraftFromChip} />
              </div>
            ),
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {t('live.coaching')}
            </div>
          ) : null}
        </div>
      ) : null}

      {error && hasConversation ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {hasConversation ? (
        <form onSubmit={handleSubmit} className="card-warm mt-3 p-3 sm:p-4 print:hidden">
          <div className="flex items-end gap-2">
            <textarea
              ref={draftRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  send(draft);
                }
              }}
              rows={2}
              className="min-h-12 flex-1 rounded-lg border border-ink/15 bg-white/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
              placeholder={t('live.replyPlaceholder')}
            />
            <button
              type="submit"
              disabled={loading || !draft.trim()}
              className="btn-primary inline-flex h-12 items-center gap-2 rounded-lg px-4 touch-target disabled:opacity-70"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{t('live.send')}</span>
            </button>
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">{t('live.replyHint')}</p>
        </form>
      ) : null}
    </div>
  );
}

function TeacherBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-terracotta/20 bg-terracotta/10 px-4 py-2.5 text-sm text-ink">
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

function CoachReply({
  text,
  result,
  t,
  onChip,
}: {
  text: string;
  result: LiveCoachResult;
  t: TranslateFn;
  onChip: (value: string) => void;
}) {
  const mode = result.actionMode;
  const ModeIcon = MODE_ICON[mode] || Sparkles;

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[92%] space-y-3 rounded-2xl rounded-bl-sm border border-ink/10 bg-parchment-light/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-terracotta" />
          <p className="flex-1 text-sm font-semibold text-ink">{text}</p>
          <ModeBadge mode={mode} icon={ModeIcon} t={t} />
        </div>

        <section className="rounded-lg border border-ink/10 bg-white/60 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="label-section">{t('live.readBack')}</p>
            <NeedBadge category={result.readBack.needCategory} />
            {result.readBack.detectedLanguage ? (
              <span className="rounded-full border border-ink/10 bg-white/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                {t('live.detectedLanguage')}: {result.readBack.detectedLanguage}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-ink-soft">{result.readBack.summaryEnglish}</p>
          {result.readBack.summaryBridge ? (
            <p className="mt-1 text-sm italic text-ink-muted">{result.readBack.summaryBridge}</p>
          ) : null}
        </section>

        {result.diagnosis ? (
          <section className="rounded-lg border border-ink/10 bg-white/60 p-3">
            <p className="label-section mb-2">{t('live.diagnosisTitle')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-terracotta/30 bg-terracotta/10 px-2.5 py-1 text-xs font-bold text-ink">
                {t('live.barrier')}: {result.diagnosis.barrier}
              </span>
              <span className="rounded-full border border-ink/10 bg-white/60 px-2.5 py-1 text-xs font-semibold text-ink-muted">
                {t('live.confidence')}: {Math.round(result.diagnosis.confidence * 100)}%
              </span>
            </div>
            {result.diagnosis.evidence ? (
              <p className="mt-2 text-xs text-ink-muted">{result.diagnosis.evidence}</p>
            ) : null}
          </section>
        ) : null}

        {result.teacherMirror ? (
          <section className="rounded-lg border border-ink/10 bg-white/60 p-3">
            <p className="label-section mb-1">{t('live.teacherMirror')}</p>
            <p className="text-sm text-ink-soft">{result.teacherMirror}</p>
          </section>
        ) : null}

        {mode === 'diagnose' && result.diagnose ? (
          <DiagnoseBlock diagnose={result.diagnose} t={t} onChip={onChip} />
        ) : null}

        {mode === 'reset' && result.reset ? (
          <ResetBlock reset={result.reset} t={t} />
        ) : null}

        {mode === 'firm_up' && result.firmUp ? (
          <FirmUpBlock firmUp={result.firmUp} t={t} />
        ) : null}

        {result.rationaleNote ? (
          <p className="text-xs italic text-ink-muted">{t('live.rationaleNote')}: {result.rationaleNote}</p>
        ) : null}

        {result.ideas && result.ideas.length > 0 ? (
          <section className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-3">
            <p className="label-section mb-1 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
              {t('live.ideasTitle')}
            </p>
            <p className="mb-2 text-[11px] text-ink-muted">{t('live.ideasHint')}</p>
            <div className="space-y-2">
              {result.ideas.map((idea, idx) => (
                <div key={`${idea.kind}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => onChip(idea.headline)}
                    className="w-full text-left"
                  >
                    <IdeaCard idea={idea} t={t} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {result.observeNext ? (
          <section className="rounded-lg border border-ink/10 bg-white/50 p-3">
            <p className="label-section mb-1">{t('live.observeNext')}</p>
            <p className="text-sm font-semibold text-ink">{result.observeNext}</p>
          </section>
        ) : null}

        {result.regainFocusLine ? (
          <section className="rounded-lg border-2 border-terracotta/40 bg-terracotta/5 p-3">
            <p className="label-section mb-1">{t('live.regainFocus')}</p>
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1 text-base font-semibold text-ink">{result.regainFocusLine}</p>
              <CopyButton value={result.regainFocusLine} />
            </div>
            {result.ifItFails ? (
              <p className="mt-2 text-xs text-ink-muted">
                {t('live.ifItFails')}: {result.ifItFails}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function DiagnoseBlock({
  diagnose,
  t,
  onChip,
}: {
  diagnose: NonNullable<LiveCoachResult['diagnose']>;
  t: TranslateFn;
  onChip: (value: string) => void;
}) {
  const options = (diagnose.clarifyingOptions || []).filter(Boolean);
  return (
    <section className="rounded-lg border border-sky-200/60 bg-sky-50/40 p-3">
      <p className="label-section mb-2 flex items-center gap-1.5">
        <Stethoscope className="h-3.5 w-3.5 text-sky-700" />
        {t('live.mode.diagnose')}
      </p>
      {diagnose.hypothesis ? <p className="text-sm text-ink-soft">{diagnose.hypothesis}</p> : null}
      {diagnose.clarifyingQuestion ? (
        <p className="mt-2 text-sm font-semibold text-ink">{diagnose.clarifyingQuestion}</p>
      ) : null}
      {options.length ? (
        <>
          <p className="mt-2 text-[11px] text-ink-muted">{t('live.tapHint')}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {options.map((option, idx) => (
              <button
                key={`${option}-${idx}`}
                type="button"
                onClick={() => onChip(option)}
                className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-800 transition hover:bg-sky-100 touch-target"
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ResetBlock({ reset, t }: { reset: NonNullable<LiveCoachResult['reset']>; t: TranslateFn }) {
  return (
    <section className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-3">
      <p className="label-section mb-2 flex items-center gap-1.5">
        <RefreshCw className="h-3.5 w-3.5 text-emerald-700" />
        {t('live.mode.reset')}
      </p>
      {reset.eefPrinciple?.principleId ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-ink/10 bg-white/60 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ink-muted">
            {reset.eefPrinciple.principleId}
          </span>
          {reset.eefPrinciple.checkAdaptAction ? (
            <span className="rounded-full border border-terracotta/30 bg-terracotta/10 px-2.5 py-1 text-xs font-bold text-ink">
              {reset.eefPrinciple.checkAdaptAction}
            </span>
          ) : null}
        </div>
      ) : null}
      {reset.eefPrinciple?.principle ? (
        <p className="text-sm font-semibold text-ink">{reset.eefPrinciple.principle}</p>
      ) : null}
      {reset.eefPrinciple?.whyThisFits ? (
        <p className="mt-1 text-xs text-ink-muted">{reset.eefPrinciple.whyThisFits}</p>
      ) : null}
      {(reset.resetActionSteps || []).filter(Boolean).length ? (
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-ink-soft">
          {reset.resetActionSteps.filter(Boolean).map((step, idx) => (
            <li key={`${step}-${idx}`}>{step}</li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function FirmUpBlock({ firmUp, t }: { firmUp: NonNullable<LiveCoachResult['firmUp']>; t: TranslateFn }) {
  const move = firmUp.talkMove;
  const frames = (firmUp.bilingualSentenceFrames || []).filter((f) => f && (f.en || f.bridge));
  return (
    <section className="rounded-lg border border-violet-200/60 bg-violet-50/40 p-3">
      <p className="label-section mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-700" />
        {t('live.mode.firm_up')}
      </p>
      {firmUp.eefRationale ? <p className="text-xs italic text-ink-muted">{firmUp.eefRationale}</p> : null}
      {move ? (
        <div className="mt-2 rounded-lg border border-ink/10 bg-white/50 px-3 py-2">
          <p className="text-sm font-semibold text-ink">
            {move.talkMoveId ? <span className="font-mono text-xs text-ink-muted">{move.talkMoveId} </span> : null}
            {move.talkMoveName}
            {move.offPalette ? <OffPaletteTag t={t} /> : null}
          </p>
          {move.why ? <p className="mt-1 text-xs text-ink-muted">{move.why}</p> : null}
          <SayLine label={t('live.sayEnglish')} value={move.sayNowEnglish} />
          <SayLine label={t('live.sayBridge')} value={move.sayNowBridge} />
        </div>
      ) : null}
      {frames.length ? (
        <div className="mt-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('live.bilingualFrames')}
          </p>
          <ul className="space-y-1.5">
            {frames.map((frame, idx) => (
              <li
                key={`${frame.en}-${idx}`}
                className="flex items-start justify-between gap-2 rounded-lg border border-ink/10 bg-white/50 px-3 py-2 text-sm text-ink-soft"
              >
                <span className="flex-1">
                  <span className="font-semibold text-ink">{frame.en}</span>
                  {frame.bridge ? <span className="text-ink-muted"> · {frame.bridge}</span> : null}
                </span>
                <CopyButton value={frame.en + (frame.bridge ? ` — ${frame.bridge}` : '')} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {firmUp.phrasingTip &&
      (firmUp.phrasingTip.tipMalay || firmUp.phrasingTip.tipIban) ? (
        <div className="mt-2">
          {firmUp.phrasingTip.tipMalay ? (
            <SayLine label={t('live.tipMalay')} value={firmUp.phrasingTip.tipMalay} />
          ) : null}
          {firmUp.phrasingTip.tipIban ? (
            <SayLine label={t('live.tipIban')} value={firmUp.phrasingTip.tipIban} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

const IDEA_META: Record<Idea['kind'], { icon: typeof Lightbulb; tone: string; labelKey: string }> = {
  'alternative-move': {
    icon: Sparkles,
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
    labelKey: 'live.ideaKind.alternative-move',
  },
  'root-cause': {
    icon: Lightbulb,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    labelKey: 'live.ideaKind.root-cause',
  },
  'missed-angle': {
    icon: Lightbulb,
    tone: 'border-violet-200 bg-violet-50 text-violet-700',
    labelKey: 'live.ideaKind.missed-angle',
  },
  risk: {
    icon: TriangleAlert,
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
    labelKey: 'live.ideaKind.risk',
  },
  'beyond-palette': {
    icon: Lightbulb,
    tone: 'border-teal-200 bg-teal-50 text-teal-700',
    labelKey: 'live.ideaKind.beyond-palette',
  },
};

function ModeBadge({ mode, icon: Icon, t }: { mode: ActionMode; icon: typeof Lightbulb; t: TranslateFn }) {
  const tone =
    mode === 'diagnose'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : mode === 'reset'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-violet-200 bg-violet-50 text-violet-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
      <Icon className="h-3 w-3" />
      {t(`live.mode.${mode}`)}
    </span>
  );
}

function OffPaletteTag({ t }: { t: TranslateFn }) {
  return (
    <span className="ml-2 inline-block rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-teal-700">
      {t('live.offPalette')}
    </span>
  );
}

function IdeaCard({ idea, t }: { idea: Idea; t: TranslateFn }) {
  const meta = IDEA_META[idea.kind] || IDEA_META['missed-angle'];
  const Icon = meta.icon;
  return (
    <div className="rounded-lg border border-ink/10 bg-white/70 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.tone}`}>
          <Icon className="h-3 w-3" />
          {t(meta.labelKey)}
        </span>
        {idea.talkMoveId ? (
          <span className="font-mono text-[11px] text-ink-muted">
            {idea.talkMoveId}
            {idea.offPalette ? <OffPaletteTag t={t} /> : null}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{idea.headline}</p>
      {idea.detail ? <p className="mt-0.5 text-xs text-ink-soft">{idea.detail}</p> : null}
      {idea.sayNowEnglish ? <SayLine label={t('live.sayEnglish')} value={idea.sayNowEnglish} /> : null}
      {idea.sayNowBridge ? <SayLine label={t('live.sayBridge')} value={idea.sayNowBridge} /> : null}
    </div>
  );
}

function StepCard({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/50 px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-terracotta/15 text-xs font-bold text-terracotta">
          {step}
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
      </div>
      {children}
    </div>
  );
}
