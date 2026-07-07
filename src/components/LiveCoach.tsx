import { FormEvent, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { LoaderCircle, Zap } from 'lucide-react';
import { useLang } from '../lib/i18n';
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

type LiveCoachResult = {
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
    missingCriticalInfo: string[];
  };
  teacherMirror?: string;
  evidenceLink?: {
    principleId: string;
    principle: string;
    whyThisFits: string;
    checkAdaptAction: string;
  };
  observeNext?: string;
  microAdaptation: {
    step1TalkMove: {
      talkMoveId: string;
      talkMoveName: string;
      why: string;
      sayNowEnglish: string;
      sayNowBridge: string;
    };
    step2SentenceFrames: {
      boardTitle: string;
      frames: string[];
    };
    step3PhrasingTip: {
      tipMalay: string;
      tipIban: string;
      whenToUse: string;
    };
  };
  regainFocusLine: string;
  ifItFails: string;
};

export default function LiveCoach() {
  const { t } = useLang();
  const [observation, setObservation, resetObservation] = usePersistentState('tmb.live.observation', '');
  const [yearLevel, setYearLevel, resetYearLevel] = usePersistentState('tmb.live.yearLevel', '4');
  const [subject, setSubject, resetSubject] = usePersistentState('tmb.live.subject', 'science');
  const [dominantLanguage, setDominantLanguage, resetDominantLanguage] = usePersistentState(
    'tmb.live.dominantLanguage',
    'iban',
  );
  const [result, setResult, resetResult] = usePersistentState<LiveCoachResult | null>('tmb.live.result', null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearTab = () => {
    resetObservation();
    resetYearLevel();
    resetSubject();
    resetDominantLanguage();
    resetResult();
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!observation.trim()) {
      setError(t('live.errors.observationRequired'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/live-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observation, yearLevel, subject, dominantLanguage }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || t('live.errors.failed'));
      }
      setResult(payload.plan as LiveCoachResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('live.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end print:hidden">
        <StartNewButton onClear={clearTab} />
      </div>
      <form onSubmit={handleSubmit} className="card-warm p-4 sm:p-5 md:p-6 print:hidden">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('live.observationLabel')}
          </span>
          <textarea
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            className="min-h-24 w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
            placeholder={t('live.observationPlaceholder')}
          />
        </label>
        <p className="mt-1 text-xs text-ink-muted">{t('live.observationHint')}</p>

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
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {loading ? t('live.coaching') : t('live.coachMe')}
        </button>
      </form>

      {result ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-4 sm:mt-6 space-y-3 sm:space-y-4"
        >
          <section className="card-warm p-4 sm:p-5">
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
            {result.teacherMirror ? (
              <p className="mt-2 rounded-lg bg-white/55 px-3 py-2 text-sm font-medium text-ink">
                {result.teacherMirror}
              </p>
            ) : null}
          </section>

          {result.diagnosis ? (
            <section className="card-warm p-4 sm:p-5">
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
              {result.diagnosis.missingCriticalInfo.length ? (
                <div className="mt-3 rounded-lg border border-ink/10 bg-white/50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                    {t('live.clarifyOnlyIfNeeded')}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                    {result.diagnosis.missingCriticalInfo.map((question, idx) => (
                      <li key={`${question}-${idx}`}>{question}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {result.evidenceLink?.principleId ? (
            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-2">{t('live.eefTitle')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-ink/10 bg-white/60 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  {result.evidenceLink.principleId}
                </span>
                {result.evidenceLink.checkAdaptAction ? (
                  <span className="rounded-full border border-terracotta/30 bg-terracotta/10 px-2.5 py-1 text-xs font-bold text-ink">
                    {result.evidenceLink.checkAdaptAction}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-semibold text-ink">{result.evidenceLink.principle}</p>
              {result.evidenceLink.whyThisFits ? (
                <p className="mt-1 text-xs text-ink-muted">{result.evidenceLink.whyThisFits}</p>
              ) : null}
            </section>
          ) : null}

          <section className="card-warm p-4 sm:p-5">
            <p className="label-section mb-3">{t('live.microTitle')}</p>
            <div className="space-y-3">
              <StepCard step="1" title={t('live.step1Title')}>
                <p className="text-sm font-semibold text-ink">
                  {result.microAdaptation.step1TalkMove.talkMoveId}{' '}
                  {result.microAdaptation.step1TalkMove.talkMoveName}
                </p>
                {result.microAdaptation.step1TalkMove.why ? (
                  <p className="mt-1 text-xs text-ink-muted">
                    {result.microAdaptation.step1TalkMove.why}
                  </p>
                ) : null}
                <SayLine
                  label={t('live.sayEnglish')}
                  value={result.microAdaptation.step1TalkMove.sayNowEnglish}
                />
                <SayLine
                  label={t('live.sayBridge')}
                  value={result.microAdaptation.step1TalkMove.sayNowBridge}
                />
              </StepCard>

              <StepCard step="2" title={t('live.step2Title')}>
                {result.microAdaptation.step2SentenceFrames.boardTitle ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {result.microAdaptation.step2SentenceFrames.boardTitle}
                  </p>
                ) : null}
                <ul className="mt-1 space-y-1.5">
                  {result.microAdaptation.step2SentenceFrames.frames.map((frame, idx) => (
                    <li
                      key={`${frame}-${idx}`}
                      className="flex items-start justify-between gap-2 rounded-lg border border-ink/10 bg-white/50 px-3 py-2 text-sm text-ink-soft"
                    >
                      <span className="flex-1">{frame}</span>
                      <CopyButton value={frame} />
                    </li>
                  ))}
                </ul>
              </StepCard>

              <StepCard step="3" title={t('live.step3Title')}>
                {result.microAdaptation.step3PhrasingTip.tipMalay ? (
                  <SayLine label={t('live.tipMalay')} value={result.microAdaptation.step3PhrasingTip.tipMalay} />
                ) : null}
                {result.microAdaptation.step3PhrasingTip.tipIban ? (
                  <SayLine label={t('live.tipIban')} value={result.microAdaptation.step3PhrasingTip.tipIban} />
                ) : null}
                {result.microAdaptation.step3PhrasingTip.whenToUse ? (
                  <p className="mt-1 text-xs text-ink-muted">
                    {result.microAdaptation.step3PhrasingTip.whenToUse}
                  </p>
                ) : null}
              </StepCard>
            </div>
          </section>

          {result.observeNext ? (
            <section className="rounded-2xl border border-ink/10 bg-white/45 p-4 sm:p-5">
              <p className="label-section mb-1">{t('live.observeNext')}</p>
              <p className="text-sm font-semibold text-ink">{result.observeNext}</p>
            </section>
          ) : null}

          {result.regainFocusLine ? (
            <section className="rounded-2xl border-2 border-terracotta/40 bg-terracotta/5 p-4 sm:p-5">
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
        </motion.div>
      ) : null}
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
