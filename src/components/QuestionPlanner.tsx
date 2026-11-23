// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Download, LoaderCircle, Printer, Sparkles } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { usePersistentState } from '../lib/usePersistentState';
import { useClassContext } from '../lib/class-context';
import {
  CollapsibleFormShell,
  CopyButton,
  LanguageLensToggle,
  SayLine,
  SegmentedTabs,
  StartNewButton,
  type LangLens,
} from './coach-ui';

export type BuilderPlan = {
  coreQuestion: {
    clearEnglish: string;
    bridgeMalayOrSarawak: string;
  };
  anticipatedAnswers: Array<{
    likelyIbanOrSarawakMalay: string;
    likelySimpleEnglish: string;
    conceptGap: string;
  }>;
  talkMove1Revoicing: {
    teacherSaysEnglish: string;
    teacherSaysBridgeMalayOrSarawak: string;
  };
  talkMove2PressReasoning: {
    questionEnglish: string;
    questionMalay: string;
  };
  codeSwitchingStrategy: {
    whenToUseBridgeLanguage: string;
    whenToReturnEnglish: string;
    comfortMove: string;
  };
  targetVocabulary: string[];
  followUpMap: Array<{
    studentAnswerType: string;
    teacherMove: string;
    nextQuestionEnglish: string;
    nextQuestionMalay: string;
  }>;
  quickBoardReadyLines: string[];
  assessmentForLearning?: {
    hingeQuestion: {
      questionEnglish: string;
      questionMalay: string;
      responseBranches: Array<{
        gapType: 'vocabulary' | 'reasoning' | 'misconception' | 'confidence';
        interpretation: string;
        nextQuestion: string;
      }>;
    };
    diagnosticReadingGuide: string;
    adaptiveActivities: Array<{
      gapType: 'vocabulary' | 'reasoning' | 'misconception' | 'confidence';
      teacherInstruction: string;
      studentTask: string;
      sentenceFrame: string;
    }>;
    reconvergenceMove: string;
  };
};

type OutputTab = 'speak' | 'responses' | 'afl';

function buildDownloadText({
  question,
  yearLevel,
  subject,
  dominantLanguage,
  classProfile,
  vocabulary,
  plan,
}: {
  question: string;
  yearLevel: string;
  subject: string;
  dominantLanguage: string;
  classProfile: string;
  vocabulary: string[];
  plan: BuilderPlan;
}): string {
  const lines: string[] = [];
  lines.push('DIALOGIC SCAFFOLDING MAP');
  lines.push('========================');
  lines.push(`Question: ${question}`);
  lines.push(`Year Level: ${yearLevel}`);
  lines.push(`Subject: ${subject}`);
  lines.push(`Dominant Language: ${dominantLanguage}`);
  lines.push(`Context: ${classProfile}`);
  lines.push(`Priority Vocabulary: ${vocabulary.join(', ') || 'N/A'}`);
  lines.push('');
  lines.push('CORE QUESTION');
  lines.push(`- English: ${plan.coreQuestion.clearEnglish}`);
  lines.push(`- Malay/Sarawak bridge: ${plan.coreQuestion.bridgeMalayOrSarawak}`);
  lines.push('');
  lines.push('ANTICIPATED ANSWERS');
  plan.anticipatedAnswers.forEach((item, idx) => {
    lines.push(`${idx + 1}. Bridge response: ${item.likelyIbanOrSarawakMalay}`);
    lines.push(`   Simple English: ${item.likelySimpleEnglish}`);
    lines.push(`   Concept gap: ${item.conceptGap}`);
  });
  lines.push('');
  lines.push('TALK MOVE 1 — REVOICING');
  lines.push(`- English: ${plan.talkMove1Revoicing.teacherSaysEnglish}`);
  lines.push(`- Bridge Malay/Sarawak: ${plan.talkMove1Revoicing.teacherSaysBridgeMalayOrSarawak}`);
  lines.push('');
  lines.push('TALK MOVE 2 — PRESS FOR REASONING');
  lines.push(`- English: ${plan.talkMove2PressReasoning.questionEnglish}`);
  lines.push(`- Malay: ${plan.talkMove2PressReasoning.questionMalay}`);
  lines.push('');
  lines.push('CODE-SWITCHING STRATEGY');
  lines.push(`- Use bridge language when: ${plan.codeSwitchingStrategy.whenToUseBridgeLanguage}`);
  lines.push(`- Return to English when: ${plan.codeSwitchingStrategy.whenToReturnEnglish}`);
  lines.push(`- Comfort move: ${plan.codeSwitchingStrategy.comfortMove}`);
  lines.push('');
  lines.push('TARGET VOCABULARY');
  lines.push(plan.targetVocabulary.map((word) => `- ${word}`).join('\n') || '- N/A');
  lines.push('');
  lines.push('FOLLOW-UP MAP');
  plan.followUpMap.forEach((step, idx) => {
    lines.push(`${idx + 1}. Student answer type: ${step.studentAnswerType}`);
    lines.push(`   Teacher move: ${step.teacherMove}`);
    lines.push(`   Next question (EN): ${step.nextQuestionEnglish}`);
    lines.push(`   Next question (MS): ${step.nextQuestionMalay}`);
  });
  lines.push('');
  lines.push('QUICK BOARD-READY LINES');
  plan.quickBoardReadyLines.forEach((line) => lines.push(`- ${line}`));
  lines.push('');
  if (plan.assessmentForLearning) {
    const afl = plan.assessmentForLearning;
    lines.push('ASSESSMENT FOR LEARNING');
    lines.push('- Hinge Question');
    lines.push(`  EN: ${afl.hingeQuestion.questionEnglish}`);
    lines.push(`  MS: ${afl.hingeQuestion.questionMalay}`);
    afl.hingeQuestion.responseBranches.forEach((b) => {
      lines.push(`  [${b.gapType.toUpperCase()}] ${b.interpretation}`);
      lines.push(`  -> ${b.nextQuestion}`);
    });
    lines.push('- Diagnostic Reading Guide');
    lines.push(`  ${afl.diagnosticReadingGuide}`);
    lines.push('- Adaptive Activities');
    afl.adaptiveActivities.forEach((a) => {
      lines.push(`  [${a.gapType.toUpperCase()}] ${a.teacherInstruction}`);
      lines.push(`  Task: ${a.studentTask}`);
      if (a.sentenceFrame) lines.push(`  Frame: "${a.sentenceFrame}"`);
    });
    lines.push('- Reconvergence Move');
    lines.push(`  ${afl.reconvergenceMove}`);
  }

  return lines.join('\n');
}

const GAP_TYPE_STYLES: Record<string, string> = {
  vocabulary: 'border-sky/35 bg-sky-bg text-[#1c5f8d]',
  reasoning: 'border-sage/35 bg-sage-bg text-[#1f6b4a]',
  misconception: 'border-amber/40 bg-amber-bg text-[#9e5f06]',
  confidence: 'border-berry/35 bg-berry-bg text-[#5a379c]',
};

function GapTypeBadge({ type, t }: { type: string; t: (key: string) => string }) {
  const style = GAP_TYPE_STYLES[type] || GAP_TYPE_STYLES.vocabulary;
  return (
    <span
      className={`inline-block rounded-full border-2 px-2.5 py-0.5 font-display text-xs font-semibold ${style}`}
    >
      {t(`builder.afl.gap.${type}`)}
    </span>
  );
}

export default function QuestionPlanner() {
  const { t } = useLang();
  const { yearLevel, subject, dominantLanguage } = useClassContext();
  const [question, setQuestion, resetQuestion] = usePersistentState('tmb.plan.question', '');
  const [classProfile, setClassProfile, resetClassProfile] = usePersistentState('tmb.plan.classProfile', '');
  const [vocabularyText, setVocabularyText, resetVocabularyText] = usePersistentState(
    'tmb.plan.vocabularyText',
    'texture, material, production',
  );
  const [plan, setPlan, resetPlan] = usePersistentState<BuilderPlan | null>('tmb.plan.result', null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formCollapsed, setFormCollapsed] = useState<boolean>(() => Boolean(plan));
  const [outputTab, setOutputTab] = useState<OutputTab>('speak');
  const [langLens, setLangLens] = useState<LangLens>('both');

  const showEn = langLens === 'both' || langLens === 'en';
  const showL1 = langLens === 'both' || langLens === 'l1';

  const clearPlanTab = () => {
    resetQuestion();
    resetClassProfile();
    resetVocabularyText();
    resetPlan();
    setFormCollapsed(false);
    setError(null);
  };

  const vocabulary = useMemo(
    () =>
      vocabularyText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [vocabularyText],
  );

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim()) {
      setError(t('builder.errors.questionRequired'));
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/talk-move-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          yearLevel,
          subject,
          dominantLanguage,
          classProfile,
          vocabulary,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || t('builder.errors.generateFailed'));
      }
      setPlan(payload.plan as BuilderPlan);
      setFormCollapsed(true);
      setOutputTab('speak');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('builder.errors.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!plan) return;
    const text = buildDownloadText({
      question,
      yearLevel,
      subject,
      dominantLanguage,
      classProfile,
      vocabulary,
      plan,
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const fileDate = new Date().toISOString().slice(0, 10);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `talk-move-plan-${fileDate}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: OutputTab; label: string }> = [
    { id: 'speak', label: t('plan.tabSpeak') },
    { id: 'responses', label: t('plan.tabResponses') },
    ...(plan?.assessmentForLearning ? [{ id: 'afl' as const, label: t('plan.tabAfl') }] : []),
  ];

  return (
    <div className="space-y-4">
      <CollapsibleFormShell
        collapsed={Boolean(plan) && formCollapsed}
        onToggle={() => setFormCollapsed((c) => !c)}
        summary={plan ? question || t('builder.outputTitle') : ''}
        actions={<StartNewButton onClear={clearPlanTab} />}
      >
        <form onSubmit={handleGenerate} className="card-warm p-4 sm:p-5">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-muted">
                {t('builder.questionLabel')}
              </span>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={3}
                className="w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2.5 text-base text-ink outline-none transition focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/20 sm:text-sm"
                placeholder={t('builder.questionPlaceholder')}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-muted">
                  {t('builder.vocabularyLabel')}
                </span>
                <input
                  value={vocabularyText}
                  onChange={(event) => setVocabularyText(event.target.value)}
                  className="min-h-[44px] w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-base text-ink outline-none transition focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/20 sm:text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-muted">
                  {t('builder.classProfileLabel')}
                </span>
                <input
                  value={classProfile}
                  onChange={(event) => setClassProfile(event.target.value)}
                  className="min-h-[44px] w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-base text-ink outline-none transition focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/20 sm:text-sm"
                />
              </label>
            </div>
          </div>

          {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 touch-target disabled:opacity-70 sm:w-auto"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? t('builder.generating') : t('builder.generate')}
          </button>
        </form>
      </CollapsibleFormShell>

      {plan ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <LanguageLensToggle value={langLens} onChange={setLangLens} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 font-display text-xs font-semibold text-ink transition hover:border-ink/30 touch-target"
              >
                <Printer className="h-4 w-4" />
                {t('builder.print')}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 font-display text-xs font-semibold text-ink transition hover:border-ink/30 touch-target"
              >
                <Download className="h-4 w-4" />
                {t('builder.downloadTxt')}
              </button>
            </div>
          </div>

          <SegmentedTabs
            tabs={tabs}
            active={outputTab}
            onChange={setOutputTab}
            ariaLabel={t('builder.outputTitle')}
          />

          {/* TAB 1: Speak & Board */}
          <div className={outputTab === 'speak' ? 'space-y-3' : 'hidden print:block print:space-y-3'}>
            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-1">{t('builder.questionLabel')}</p>
              {showEn ? (
                <SayLine label={t('builder.englishColumn')} value={plan.coreQuestion.clearEnglish} tone="en" />
              ) : null}
              {showL1 ? (
                <SayLine label={t('builder.bridgeColumn')} value={plan.coreQuestion.bridgeMalayOrSarawak} tone="l1" />
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="label-section">{t('builder.revoiceEnglish').split(' (')[0]}</p>
                  {showEn ? (
                    <SayLine label={t('builder.revoiceEnglish')} value={plan.talkMove1Revoicing.teacherSaysEnglish} tone="en" />
                  ) : null}
                  {showL1 ? (
                    <SayLine label={t('builder.revoiceBridge')} value={plan.talkMove1Revoicing.teacherSaysBridgeMalayOrSarawak} tone="l1" />
                  ) : null}
                </div>
                <div>
                  <p className="label-section">{t('builder.reasoningEnglish').split(' (')[0]}</p>
                  {showEn ? (
                    <SayLine label={t('builder.reasoningEnglish')} value={plan.talkMove2PressReasoning.questionEnglish} tone="en" />
                  ) : null}
                  {showL1 ? (
                    <SayLine label={t('builder.reasoningMalay')} value={plan.talkMove2PressReasoning.questionMalay} tone="l1" />
                  ) : null}
                </div>
              </div>
            </section>

            {plan.targetVocabulary.length > 0 ? (
              <section className="card-warm p-4 sm:p-5">
                <p className="label-section mb-2.5">{t('builder.targetVocab')}</p>
                <div className="flex flex-wrap gap-2">
                  {plan.targetVocabulary.map((word) => (
                    <span key={word} className="pill-sky">
                      {word}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {plan.quickBoardReadyLines.length > 0 ? (
              <section className="card-warm p-4 sm:p-5">
                <p className="label-section mb-2.5">{t('builder.quickLines')}</p>
                <ul className="space-y-2">
                  {plan.quickBoardReadyLines.map((line, idx) => (
                    <li
                      key={`${line}-${idx}`}
                      className="flex items-start justify-between gap-2 rounded-2xl border-2 border-ink/10 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink"
                    >
                      <span className="flex-1">{line}</span>
                      <CopyButton value={line} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* TAB 2: If Pupils Say */}
          <div className={outputTab === 'responses' ? 'space-y-3' : 'hidden print:block print:space-y-3'}>
            {plan.followUpMap.length > 0 ? (
              <section className="card-warm p-4 sm:p-5">
                <p className="label-section mb-2.5">{t('builder.followUpMap')}</p>
                <ol className="space-y-2.5">
                  {plan.followUpMap.map((step, idx) => (
                    <li key={`${step.studentAnswerType}-${idx}`} className="rounded-2xl border-2 border-ink/10 bg-white p-3.5">
                      <p className="font-display text-sm font-semibold text-ink">{step.studentAnswerType}</p>
                      <p className="mt-1 text-sm text-ink-soft">{step.teacherMove}</p>
                      {showEn ? <SayLine label="EN" value={step.nextQuestionEnglish} tone="en" /> : null}
                      {showL1 ? <SayLine label="L1" value={step.nextQuestionMalay} tone="l1" /> : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {plan.anticipatedAnswers.length > 0 ? (
              <section className="card-warm p-4 sm:p-5">
                <p className="label-section mb-2.5">{t('builder.anticipatedAnswers')}</p>
                <ul className="space-y-2">
                  {plan.anticipatedAnswers.map((item, idx) => (
                    <li
                      key={`${item.likelyIbanOrSarawakMalay}-${idx}`}
                      className="rounded-2xl border-2 border-ink/10 bg-white px-3.5 py-3 text-sm"
                    >
                      {showL1 && item.likelyIbanOrSarawakMalay ? (
                        <p className="font-semibold text-ink">{item.likelyIbanOrSarawakMalay}</p>
                      ) : null}
                      {showEn && item.likelySimpleEnglish ? (
                        <p className="mt-1 text-ink-soft">{item.likelySimpleEnglish}</p>
                      ) : null}
                      {item.conceptGap ? (
                        <p className="mt-1.5 text-xs font-bold text-terracotta">
                          {t('builder.conceptGap')}: {item.conceptGap}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-2">{t('builder.codeswitch')}</p>
              <ul className="space-y-1.5 text-sm text-ink-soft">
                {[
                  plan.codeSwitchingStrategy.whenToUseBridgeLanguage,
                  plan.codeSwitchingStrategy.whenToReturnEnglish,
                  plan.codeSwitchingStrategy.comfortMove,
                ]
                  .filter(Boolean)
                  .map((tip, idx) => (
                    <li key={idx} className="rounded-xl border border-ink/10 bg-white px-3 py-2">
                      {tip}
                    </li>
                  ))}
              </ul>
            </section>
          </div>

          {/* TAB 3: Assessment for Learning */}
          {plan.assessmentForLearning ? (
            <div className={outputTab === 'afl' ? 'space-y-3' : 'hidden print:block print:space-y-3'}>
              <section className="card-warm p-4 sm:p-5">
                <p className="label-section mb-2">{t('builder.afl.hingeQuestion')}</p>
                {showEn ? (
                  <SayLine label="EN" value={plan.assessmentForLearning.hingeQuestion.questionEnglish} tone="en" />
                ) : null}
                {showL1 ? (
                  <SayLine label="L1" value={plan.assessmentForLearning.hingeQuestion.questionMalay} tone="l1" />
                ) : null}

                <div className="mt-3 space-y-2">
                  {plan.assessmentForLearning.hingeQuestion.responseBranches.map((branch, idx) => (
                    <div key={`branch-${idx}`} className="rounded-2xl border-2 border-ink/10 bg-white p-3">
                      <GapTypeBadge type={branch.gapType} t={t} />
                      <p className="mt-1.5 text-sm font-semibold text-ink">{branch.interpretation}</p>
                      {branch.nextQuestion ? (
                        <p className="mt-1 text-xs font-semibold text-ink-muted">→ {branch.nextQuestion}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              {plan.assessmentForLearning.adaptiveActivities.length > 0 ? (
                <section className="card-warm p-4 sm:p-5">
                  <p className="label-section mb-2.5">{t('builder.afl.adaptiveActivities')}</p>
                  <div className="space-y-2.5">
                    {plan.assessmentForLearning.adaptiveActivities.map((activity, idx) => (
                      <div key={`activity-${idx}`} className="rounded-2xl border-2 border-ink/10 bg-white p-3.5">
                        <GapTypeBadge type={activity.gapType} t={t} />
                        <p className="mt-1.5 text-sm font-bold text-ink">{activity.teacherInstruction}</p>
                        {activity.studentTask ? (
                          <p className="mt-1 text-sm text-ink-soft">{activity.studentTask}</p>
                        ) : null}
                        {activity.sentenceFrame ? (
                          <SayLine label="Frame" value={activity.sentenceFrame} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {plan.assessmentForLearning.diagnosticReadingGuide || plan.assessmentForLearning.reconvergenceMove ? (
                <section className="card-warm space-y-3 p-4 sm:p-5">
                  {plan.assessmentForLearning.diagnosticReadingGuide ? (
                    <div>
                      <p className="label-section mb-1">{t('builder.afl.diagnosticGuide')}</p>
                      <p className="text-sm text-ink-soft">{plan.assessmentForLearning.diagnosticReadingGuide}</p>
                    </div>
                  ) : null}
                  {plan.assessmentForLearning.reconvergenceMove ? (
                    <div className="border-t border-ink/10 pt-3">
                      <p className="label-section mb-1">{t('builder.afl.reconvergence')}</p>
                      <p className="text-sm font-semibold text-ink">{plan.assessmentForLearning.reconvergenceMove}</p>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}
