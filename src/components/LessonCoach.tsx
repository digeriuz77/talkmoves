// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { FormEvent, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Download, FileText, LoaderCircle, Upload, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { usePersistentState } from '../lib/usePersistentState';
import { useClassContext } from '../lib/class-context';
import { useActiveStrategy } from '../lib/strategy-context';
import { getStrategy, type Core6Strategy } from '../lib/core6-strategies';
import {
  AiNotice,
  CollapsibleFormShell,
  CopyButton,
  LanguageLensToggle,
  NeedBadge,
  PrivacyNotice,
  SayLine,
  SegmentedTabs,
  StartNewButton,
  StrategySpotlightBadge,
  type LangLens,
  type NeedCategory,
} from './coach-ui';

type LessonCoachResult = {
  planSummary: string;
  detectedConcern: { category: NeedCategory; rationale: string };
  riskMoments: Array<{
    momentLabel: string;
    lessonPhase: string;
    whyRisky: string;
    talkMoveId: string;
    talkMoveName: string;
    teacherScriptEnglish: string;
    teacherScriptBridge: string;
    sentenceFrames: string[];
  }>;
  pacingCoach: {
    teacherTalkZones: Array<{
      zone: string;
      signal: string;
      hardBreakMoveId: string;
      hardBreakMoveName: string;
      script: string;
    }>;
    talkRatioTip: string;
  };
  languageBridge: {
    cognates: Array<{ english: string; malay: string; note: string }>;
    quickSheet: {
      targetQuestionEnglish: string;
      lowStakesEntryBridge: string;
      sentenceFrames: string[];
    };
  };
  instructionalHinge: {
    hingeQuestionEnglish: string;
    hingeQuestionBridge: string;
    gamePlan: Array<{
      ifStudentSays: string;
      language: string;
      useMoveId: string;
      useMoveName: string;
      teacherResponse: string;
    }>;
  };
  agencyShift: string[];
};

type LessonTab = 'quick' | 'risks' | 'pacing';

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildDownloadText(
  result: LessonCoachResult,
  notes: { strategy?: Core6Strategy | null; strategyLabel?: string; aiNotice?: string } = {},
): string {
  const lines: string[] = [];
  lines.push('LESSON PLAN COACH — EAL RISK GAME PLAN');
  lines.push('======================================');
  if (notes.strategy && notes.strategyLabel) {
    lines.push(
      `${notes.strategyLabel}: ${notes.strategy.id} — ${notes.strategy.name} (${notes.strategy.window})`,
    );
  }
  lines.push(`Summary: ${result.planSummary}`);
  lines.push(`Detected concern: ${result.detectedConcern.category} — ${result.detectedConcern.rationale}`);
  lines.push('');
  lines.push('HIGH-RISK MOMENTS');
  result.riskMoments.forEach((m, idx) => {
    lines.push(`${idx + 1}. ${m.momentLabel}${m.lessonPhase ? ` (${m.lessonPhase})` : ''}`);
    lines.push(`   Why risky: ${m.whyRisky}`);
    lines.push(`   Move: ${m.talkMoveId} ${m.talkMoveName}`);
    lines.push(`   Say (EN): ${m.teacherScriptEnglish}`);
    lines.push(`   Say (bridge): ${m.teacherScriptBridge}`);
    m.sentenceFrames.forEach((f) => lines.push(`   Frame: ${f}`));
  });
  lines.push('');
  lines.push('PACING COACH — TEACHER-TALK OVERLOAD ZONES');
  result.pacingCoach.teacherTalkZones.forEach((z, idx) => {
    lines.push(`${idx + 1}. ${z.zone}`);
    lines.push(`   Signal: ${z.signal}`);
    lines.push(`   Hard break: ${z.hardBreakMoveId} ${z.hardBreakMoveName}`);
    lines.push(`   Script: ${z.script}`);
  });
  if (result.pacingCoach.talkRatioTip) lines.push(`Talk ratio tip: ${result.pacingCoach.talkRatioTip}`);
  lines.push('');
  lines.push('LANGUAGE BRIDGE — COGNATES');
  result.languageBridge.cognates.forEach((c) => {
    lines.push(`- ${c.english} <-> ${c.malay}${c.note ? ` (${c.note})` : ''}`);
  });
  lines.push('');
  lines.push('QUICK-SHEET');
  lines.push(`Target question (EN): ${result.languageBridge.quickSheet.targetQuestionEnglish}`);
  lines.push(`Low-stakes entry (bridge): ${result.languageBridge.quickSheet.lowStakesEntryBridge}`);
  result.languageBridge.quickSheet.sentenceFrames.forEach((f) => lines.push(`Frame: ${f}`));
  lines.push('');
  lines.push('INSTRUCTIONAL HINGE');
  lines.push(`Hinge (EN): ${result.instructionalHinge.hingeQuestionEnglish}`);
  lines.push(`Hinge (bridge): ${result.instructionalHinge.hingeQuestionBridge}`);
  result.instructionalHinge.gamePlan.forEach((g) => {
    lines.push(`- If pupil says "${g.ifStudentSays}"${g.language ? ` [${g.language}]` : ''} -> ${g.useMoveId} ${g.useMoveName}: ${g.teacherResponse}`);
  });
  lines.push('');
  lines.push('AGENCY SHIFT — CUT TEACHER TALK');
  result.agencyShift.forEach((tip) => lines.push(`- ${tip}`));
  if (notes.aiNotice) {
    lines.push('');
    lines.push(notes.aiNotice);
  }
  return lines.join('\n');
}

export default function LessonCoach() {
  const { t } = useLang();
  const { yearLevel, subject, dominantLanguage } = useClassContext();
  const { activeStrategy } = useActiveStrategy();
  const [lessonText, setLessonText, resetLessonText] = usePersistentState('tmb.lesson.lessonText', '');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [focusConcern, setFocusConcern, resetFocusConcern] = usePersistentState('tmb.lesson.focusConcern', '');
  const [result, setResult, resetResult] = usePersistentState<LessonCoachResult | null>('tmb.lesson.result', null);
  // Core 6 strategy the stored result was generated with (echoed by the server), for the badge.
  const [resultStrategy, setResultStrategy, resetResultStrategy] = usePersistentState<string>(
    'tmb.lesson.strategy',
    '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formCollapsed, setFormCollapsed] = useState<boolean>(() => Boolean(result));
  const [activeTab, setActiveTab] = useState<LessonTab>('quick');
  const [langLens, setLangLens] = useState<LangLens>('both');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showEn = langLens === 'both' || langLens === 'en';
  const showL1 = langLens === 'both' || langLens === 'l1';

  const handleFile = async (file: File) => {
    setError(null);
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        setPdfBase64(toBase64(buffer));
        setLessonText('');
      } else {
        const text = await file.text();
        setLessonText(text);
        setPdfBase64(null);
      }
      setFileName(file.name);
    } catch {
      setError(t('lesson.errors.fileRead'));
    }
  };

  const clearFile = () => {
    setPdfBase64(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearTab = () => {
    resetLessonText();
    resetFocusConcern();
    resetResult();
    resetResultStrategy();
    clearFile();
    setFormCollapsed(false);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lessonText.trim() && !pdfBase64) {
      setError(t('lesson.errors.textRequired'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/lesson-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonPlanText: lessonText,
          pdfBase64: lessonText.trim() ? undefined : pdfBase64,
          yearLevel,
          subject,
          dominantLanguage,
          focusConcern,
          activeStrategy,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || t('lesson.errors.failed'));
      }
      setResult(payload.plan as LessonCoachResult);
      setResultStrategy(payload?.meta?.strategy?.id || '');
      setFormCollapsed(true);
      setActiveTab('quick');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('lesson.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob(
      [
        buildDownloadText(result, {
          strategy: getStrategy(resultStrategy),
          strategyLabel: t('strategy.spotlight'),
          aiNotice: t('coach.aiNotice'),
        }),
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lesson-coach-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const summaryLabel = fileName || lessonText.trim().slice(0, 60) || t('lesson.outputTitle');

  return (
    <div className="space-y-4">
      <CollapsibleFormShell
        collapsed={Boolean(result) && formCollapsed}
        onToggle={() => setFormCollapsed((c) => !c)}
        summary={result ? summaryLabel : ''}
        actions={<StartNewButton onClear={clearTab} />}
      >
        <form onSubmit={handleSubmit} className="card-warm p-4 sm:p-5">
          <PrivacyNotice />

          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-muted">
              {t('lesson.pasteLabel')}
            </span>
            <textarea
              value={lessonText}
              onChange={(event) => {
                setLessonText(event.target.value);
                if (event.target.value.trim()) clearFile();
              }}
              rows={4}
              className="w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2.5 text-base text-ink outline-none transition focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/20 sm:text-sm"
              placeholder={t('lesson.pastePlaceholder')}
            />
          </label>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-ink/15 bg-white px-3.5 py-2 font-display text-xs font-semibold text-ink transition hover:border-terracotta/40 touch-target"
            >
              <Upload className="h-4 w-4 text-terracotta" />
              {t('lesson.uploadLabel')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,text/plain,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            {fileName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sage/30 bg-sage-bg px-3 py-1 text-xs font-bold text-[#1f6b4a]">
                <FileText className="h-3.5 w-3.5" />
                {fileName}
                <button type="button" onClick={clearFile} aria-label={t('lesson.removeFile')}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : (
              <span className="text-xs font-semibold text-ink-muted">{t('lesson.uploadHint')}</span>
            )}
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-muted">
              {t('lesson.concernLabel')}
            </span>
            <input
              value={focusConcern}
              onChange={(event) => setFocusConcern(event.target.value)}
              className="min-h-[44px] w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-base text-ink outline-none transition focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/20 sm:text-sm"
              placeholder={t('lesson.concernPlaceholder')}
            />
          </label>

          {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 touch-target disabled:opacity-70 sm:w-auto"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {loading ? t('lesson.analyzing') : t('lesson.analyze')}
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
          {/* Compact Detected Concern Banner */}
          <section className="card-warm p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <NeedBadge category={result.detectedConcern.category} />
                <span className="text-xs font-bold text-ink-muted">{t('lesson.detectedConcern')}</span>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3 py-1.5 font-display text-xs font-semibold text-ink transition hover:border-ink/30 touch-target print:hidden"
              >
                <Download className="h-3.5 w-3.5" />
                {t('builder.downloadTxt')}
              </button>
            </div>
            {/* Generated output header: strategy spotlight + AI transparency (kept in print) */}
            <div className="flex w-full flex-wrap items-center gap-2">
              <StrategySpotlightBadge strategyId={resultStrategy} />
              <AiNotice />
            </div>
            {result.planSummary ? (
              <p className="mt-2 text-sm font-semibold text-ink">{result.planSummary}</p>
            ) : null}
            {result.detectedConcern.rationale ? (
              <p className="mt-1 text-xs text-ink-soft">{result.detectedConcern.rationale}</p>
            ) : null}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <LanguageLensToggle value={langLens} onChange={setLangLens} />
          </div>

          <SegmentedTabs
            ariaLabel={t('lesson.outputTitle')}
            active={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'quick', label: t('lesson.tabQuick') },
              {
                id: 'risks',
                label: t('lesson.tabRisks'),
                badge: result.riskMoments.length ? String(result.riskMoments.length) : undefined,
              },
              { id: 'pacing', label: t('lesson.tabPacing') },
            ]}
          />

          {/* TAB 1: Quick-Sheet */}
          <div className={activeTab === 'quick' ? 'space-y-3' : 'hidden print:block print:space-y-3'}>
            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-2">{t('lesson.quickSheet')}</p>
              {showEn ? (
                <SayLine
                  label={t('lesson.targetQuestion')}
                  value={result.languageBridge.quickSheet.targetQuestionEnglish}
                  tone="en"
                />
              ) : null}
              {showL1 ? (
                <SayLine
                  label={t('lesson.lowStakesEntry')}
                  value={result.languageBridge.quickSheet.lowStakesEntryBridge}
                  tone="l1"
                />
              ) : null}
              {result.languageBridge.quickSheet.sentenceFrames.length > 0 ? (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-muted">
                    {t('lesson.frames')}
                  </p>
                  <ul className="space-y-2">
                    {result.languageBridge.quickSheet.sentenceFrames.map((frame, idx) => (
                      <li
                        key={`qs-frame-${idx}`}
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

            {result.languageBridge.cognates.length > 0 ? (
              <section className="card-warm p-4 sm:p-5">
                <p className="label-section mb-2.5">{t('lesson.cognates')}</p>
                <div className="flex flex-wrap gap-2">
                  {result.languageBridge.cognates.map((cognate, idx) => (
                    <div
                      key={`cognate-${idx}`}
                      className="rounded-2xl border-2 border-sky/25 bg-sky-bg/60 px-3 py-2 text-sm"
                    >
                      <span className="font-display font-bold text-ink">{cognate.english}</span>
                      <span className="mx-1.5 text-sky">↔</span>
                      <span className="font-display font-bold text-[#1c5f8d]">{cognate.malay}</span>
                      {cognate.note ? (
                        <p className="mt-0.5 text-xs text-ink-muted">{cognate.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {result.agencyShift.length > 0 ? (
              <section className="card-warm p-4 sm:p-5">
                <p className="label-section mb-2">{t('lesson.agencyShift')}</p>
                <ul className="space-y-2 text-sm text-ink-soft">
                  {result.agencyShift.map((tip, idx) => (
                    <li key={`agency-${idx}`} className="rounded-xl border-2 border-sage/20 bg-sage-bg/40 px-3.5 py-2.5 font-semibold text-ink">
                      {tip}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* TAB 2: High-Risk Moments */}
          <div className={activeTab === 'risks' ? 'space-y-2.5' : 'hidden print:block print:space-y-2.5'}>
            {result.riskMoments.map((moment, idx) => (
              <details
                key={`risk-${idx}`}
                open={idx === 0}
                className="card-warm group overflow-hidden p-4"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden touch-target">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-terracotta font-display text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold text-ink">{moment.momentLabel}</p>
                    {moment.lessonPhase ? (
                      <span className="text-xs font-bold text-ink-muted">{moment.lessonPhase}</span>
                    ) : null}
                  </div>
                  {moment.talkMoveName ? (
                    <span className="pill-terracotta hidden sm:inline-block">{moment.talkMoveName}</span>
                  ) : null}
                </summary>

                <div className="mt-3 border-t border-ink/10 pt-3">
                  <p className="text-sm text-ink-soft">{moment.whyRisky}</p>
                  {moment.talkMoveId || moment.talkMoveName ? (
                    <p className="mt-2 font-display text-xs font-bold uppercase tracking-wide text-terracotta">
                      {moment.talkMoveId} {moment.talkMoveName}
                    </p>
                  ) : null}
                  {showEn ? (
                    <SayLine label={t('lesson.scriptEnglish')} value={moment.teacherScriptEnglish} tone="en" />
                  ) : null}
                  {showL1 ? (
                    <SayLine label={t('lesson.scriptBridge')} value={moment.teacherScriptBridge} tone="l1" />
                  ) : null}
                  {moment.sentenceFrames.length > 0 ? (
                    <div className="mt-2.5">
                      <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
                        {t('lesson.frames')}
                      </p>
                      <ul className="space-y-1">
                        {moment.sentenceFrames.map((frame, frameIdx) => (
                          <li key={`frame-${idx}-${frameIdx}`} className="text-sm font-semibold italic text-ink-soft">
                            "{frame}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>

          {/* TAB 3: Pacing & Hinge */}
          <div className={activeTab === 'pacing' ? 'space-y-3' : 'hidden print:block print:space-y-3'}>
            {result.pacingCoach.teacherTalkZones.length > 0 || result.pacingCoach.talkRatioTip ? (
              <section className="card-warm p-4 sm:p-5">
                <p className="label-section mb-2.5">{t('lesson.pacingCoach')}</p>
                <div className="space-y-2.5">
                  {result.pacingCoach.teacherTalkZones.map((zone, idx) => (
                    <div key={`zone-${idx}`} className="rounded-2xl border-2 border-amber/35 bg-amber-bg/60 p-3.5">
                      <p className="font-display text-sm font-bold text-ink">{zone.zone}</p>
                      {zone.signal ? <p className="mt-0.5 text-xs text-ink-soft">{zone.signal}</p> : null}
                      <p className="mt-1.5 font-display text-xs font-bold text-terracotta">
                        {t('lesson.hardBreak')}: {zone.hardBreakMoveId} {zone.hardBreakMoveName}
                      </p>
                      <SayLine label={t('lesson.script')} value={zone.script} />
                    </div>
                  ))}
                </div>
                {result.pacingCoach.talkRatioTip ? (
                  <p className="mt-3 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink-soft">
                    {result.pacingCoach.talkRatioTip}
                  </p>
                ) : null}
              </section>
            ) : null}

            {result.instructionalHinge.hingeQuestionEnglish || result.instructionalHinge.gamePlan.length > 0 ? (
              <section className="card-warm p-4 sm:p-5">
                <p className="label-section mb-2">{t('lesson.hinge')}</p>
                {showEn ? (
                  <SayLine label="EN" value={result.instructionalHinge.hingeQuestionEnglish} tone="en" />
                ) : null}
                {showL1 ? (
                  <SayLine label="L1" value={result.instructionalHinge.hingeQuestionBridge} tone="l1" />
                ) : null}
                {result.instructionalHinge.gamePlan.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-ink-muted">
                      {t('lesson.gamePlan')}
                    </p>
                    {result.instructionalHinge.gamePlan.map((branch, idx) => (
                      <div key={`branch-${idx}`} className="rounded-2xl border-2 border-ink/10 bg-white p-3">
                        <p className="text-sm text-ink-soft">
                          <span className="font-bold text-ink">{t('lesson.ifStudentSays')}</span>{' '}
                          "{branch.ifStudentSays}"
                          {branch.language ? (
                            <span className="text-xs font-bold text-ink-muted"> [{branch.language}]</span>
                          ) : null}
                        </p>
                        <p className="mt-1 font-display text-xs font-bold text-terracotta">
                          {branch.useMoveId} {branch.useMoveName}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink">{branch.teacherResponse}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
