import { FormEvent, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Download, FileText, LoaderCircle, Upload, X } from 'lucide-react';
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

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildDownloadText(result: LessonCoachResult): string {
  const lines: string[] = [];
  lines.push('LESSON PLAN COACH — EAL RISK GAME PLAN');
  lines.push('======================================');
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
    lines.push(`- ${c.english} ↔ ${c.malay}${c.note ? ` (${c.note})` : ''}`);
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
    lines.push(`- If pupil says "${g.ifStudentSays}"${g.language ? ` [${g.language}]` : ''} → ${g.useMoveId} ${g.useMoveName}: ${g.teacherResponse}`);
  });
  lines.push('');
  lines.push('AGENCY SHIFT — CUT TEACHER TALK');
  result.agencyShift.forEach((tip) => lines.push(`- ${tip}`));
  return lines.join('\n');
}

export default function LessonCoach() {
  const { t } = useLang();
  const [lessonText, setLessonText, resetLessonText] = usePersistentState('tmb.lesson.lessonText', '');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [yearLevel, setYearLevel, resetYearLevel] = usePersistentState('tmb.lesson.yearLevel', '4');
  const [subject, setSubject, resetSubject] = usePersistentState('tmb.lesson.subject', 'science');
  const [dominantLanguage, setDominantLanguage, resetDominantLanguage] = usePersistentState(
    'tmb.lesson.dominantLanguage',
    'iban',
  );
  const [focusConcern, setFocusConcern, resetFocusConcern] = usePersistentState('tmb.lesson.focusConcern', '');
  const [result, setResult, resetResult] = usePersistentState<LessonCoachResult | null>('tmb.lesson.result', null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    resetYearLevel();
    resetSubject();
    resetDominantLanguage();
    resetFocusConcern();
    resetResult();
    clearFile();
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
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || t('lesson.errors.failed'));
      }
      setResult(payload.plan as LessonCoachResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('lesson.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([buildDownloadText(result)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lesson-coach-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-3 flex justify-end print:hidden">
        <StartNewButton onClear={clearTab} />
      </div>
      <form onSubmit={handleSubmit} className="card-warm p-4 sm:p-5 md:p-6 print:hidden">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('lesson.pasteLabel')}
          </span>
          <textarea
            value={lessonText}
            onChange={(event) => {
              setLessonText(event.target.value);
              if (event.target.value.trim()) clearFile();
            }}
            className="min-h-36 w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
            placeholder={t('lesson.pastePlaceholder')}
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-ink/20 bg-white/70 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white touch-target"
          >
            <Upload className="h-4 w-4" />
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/60 px-2.5 py-1 text-xs text-ink-soft">
              <FileText className="h-3.5 w-3.5" />
              {fileName}
              <button type="button" onClick={clearFile} aria-label={t('lesson.removeFile')}>
                <X className="h-3.5 w-3.5 text-ink-muted hover:text-ink" />
              </button>
            </span>
          ) : (
            <span className="text-xs text-ink-muted">{t('lesson.uploadHint')}</span>
          )}
        </div>

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

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('lesson.concernLabel')}
          </span>
          <input
            value={focusConcern}
            onChange={(event) => setFocusConcern(event.target.value)}
            className="w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
            placeholder={t('lesson.concernPlaceholder')}
          />
        </label>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-4 inline-flex items-center gap-2 rounded-lg touch-target disabled:opacity-70"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {loading ? t('lesson.analyzing') : t('lesson.analyze')}
        </button>
      </form>

      {result ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-4 sm:mt-6 space-y-3 sm:space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <h2 className="font-display text-lg font-bold text-ink">{t('lesson.outputTitle')}</h2>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg border border-ink/20 bg-white/70 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white touch-target"
            >
              <Download className="h-4 w-4" />
              {t('builder.downloadTxt')}
            </button>
          </div>

          <section className="card-warm p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="label-section">{t('lesson.detectedConcern')}</p>
              <NeedBadge category={result.detectedConcern.category} />
            </div>
            {result.planSummary ? <p className="text-sm text-ink-soft">{result.planSummary}</p> : null}
            {result.detectedConcern.rationale ? (
              <p className="mt-1 text-xs text-ink-muted">{result.detectedConcern.rationale}</p>
            ) : null}
          </section>

          {result.riskMoments.length > 0 ? (
            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-3">{t('lesson.riskMoments')}</p>
              <div className="space-y-3">
                {result.riskMoments.map((moment, idx) => (
                  <div key={`risk-${idx}`} className="rounded-lg border border-ink/10 bg-white/50 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-700">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-semibold text-ink">{moment.momentLabel}</p>
                      {moment.lessonPhase ? (
                        <span className="rounded-full border border-ink/10 bg-white/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-muted">
                          {moment.lessonPhase}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm text-ink-soft">{moment.whyRisky}</p>
                    {moment.talkMoveId || moment.talkMoveName ? (
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-terracotta">
                        {moment.talkMoveId} {moment.talkMoveName}
                      </p>
                    ) : null}
                    <SayLine label={t('lesson.scriptEnglish')} value={moment.teacherScriptEnglish} />
                    <SayLine label={t('lesson.scriptBridge')} value={moment.teacherScriptBridge} />
                    {moment.sentenceFrames.length > 0 ? (
                      <div className="mt-2">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                          {t('lesson.frames')}
                        </p>
                        <ul className="space-y-1">
                          {moment.sentenceFrames.map((frame, frameIdx) => (
                            <li key={`frame-${idx}-${frameIdx}`} className="text-sm italic text-ink-soft">
                              "{frame}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {result.pacingCoach.teacherTalkZones.length > 0 || result.pacingCoach.talkRatioTip ? (
            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-3">{t('lesson.pacingCoach')}</p>
              <div className="space-y-2">
                {result.pacingCoach.teacherTalkZones.map((zone, idx) => (
                  <div key={`zone-${idx}`} className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
                    <p className="text-sm font-semibold text-ink">{zone.zone}</p>
                    {zone.signal ? <p className="mt-0.5 text-xs text-ink-muted">{zone.signal}</p> : null}
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-terracotta">
                      {t('lesson.hardBreak')}: {zone.hardBreakMoveId} {zone.hardBreakMoveName}
                    </p>
                    <SayLine label={t('lesson.script')} value={zone.script} />
                  </div>
                ))}
              </div>
              {result.pacingCoach.talkRatioTip ? (
                <p className="mt-3 rounded-lg border border-ink/10 bg-white/50 px-3 py-2 text-sm text-ink-soft">
                  {result.pacingCoach.talkRatioTip}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="card-warm p-4 sm:p-5">
            <p className="label-section mb-3">{t('lesson.languageBridge')}</p>
            {result.languageBridge.cognates.length > 0 ? (
              <div className="mb-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t('lesson.cognates')}
                </p>
                <ul className="space-y-1.5">
                  {result.languageBridge.cognates.map((cognate, idx) => (
                    <li
                      key={`cognate-${idx}`}
                      className="rounded-lg border border-ink/10 bg-white/50 px-3 py-2 text-sm text-ink-soft"
                    >
                      <span className="font-semibold text-ink">{cognate.english}</span>
                      {' ↔ '}
                      <span className="font-semibold text-ink">{cognate.malay}</span>
                      {cognate.note ? <span className="text-xs text-ink-muted"> — {cognate.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t('lesson.quickSheet')}
            </p>
            <div className="rounded-lg border border-ink/10 bg-white/50 px-3 py-3">
              <SayLine
                label={t('lesson.targetQuestion')}
                value={result.languageBridge.quickSheet.targetQuestionEnglish}
              />
              <SayLine
                label={t('lesson.lowStakesEntry')}
                value={result.languageBridge.quickSheet.lowStakesEntryBridge}
              />
              {result.languageBridge.quickSheet.sentenceFrames.length > 0 ? (
                <div className="mt-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    {t('lesson.frames')}
                  </p>
                  <ul className="space-y-1.5">
                    {result.languageBridge.quickSheet.sentenceFrames.map((frame, idx) => (
                      <li
                        key={`qs-frame-${idx}`}
                        className="flex items-start justify-between gap-2 rounded-lg border border-ink/10 bg-white/60 px-3 py-2 text-sm text-ink-soft"
                      >
                        <span className="flex-1">{frame}</span>
                        <CopyButton value={frame} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>

          {result.instructionalHinge.hingeQuestionEnglish || result.instructionalHinge.gamePlan.length > 0 ? (
            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-3">{t('lesson.hinge')}</p>
              <SayLine label="EN" value={result.instructionalHinge.hingeQuestionEnglish} />
              <SayLine label="MS/Iban" value={result.instructionalHinge.hingeQuestionBridge} />
              {result.instructionalHinge.gamePlan.length > 0 ? (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {t('lesson.gamePlan')}
                  </p>
                  <div className="space-y-2">
                    {result.instructionalHinge.gamePlan.map((branch, idx) => (
                      <div key={`branch-${idx}`} className="rounded-lg border border-ink/10 bg-white/50 px-3 py-2">
                        <p className="text-sm text-ink-soft">
                          <span className="font-semibold text-ink">{t('lesson.ifStudentSays')}</span>{' '}
                          "{branch.ifStudentSays}"
                          {branch.language ? (
                            <span className="text-xs text-ink-muted"> [{branch.language}]</span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-terracotta">
                          {branch.useMoveId} {branch.useMoveName}
                        </p>
                        <p className="mt-1 text-sm text-ink-soft">{branch.teacherResponse}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {result.agencyShift.length > 0 ? (
            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-2">{t('lesson.agencyShift')}</p>
              <ul className="space-y-1.5 text-sm text-ink-soft">
                {result.agencyShift.map((tip, idx) => (
                  <li key={`agency-${idx}`} className="rounded-lg border border-ink/10 bg-white/50 px-3 py-2">
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}


