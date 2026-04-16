import { FormEvent, useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Copy, Download, LoaderCircle } from 'lucide-react';
import { useLang } from '../lib/i18n';

// Standardized dropdown values
const subjects = ['science', 'maths', 'english', 'design', 'it'];
const yearLevels = Array.from({ length: 6 }, (_, i) => (i + 1).toString());
const languages = ['english', 'malay', 'iban'];

type BuilderPlan = {
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
};

type BuilderInput = {
  subject: string;
  dominantLanguage: string;
};

type BuilderMeta = {
  fromCache: boolean;
  modelUsed: string;
  mode: 'high-quality' | 'high-speed';
  counters: { date: string; proCalls: number; flashCalls: number };
};

type TalkMoveBuilderProps = {
  onBack: () => void;
};

async function copyText(value: string) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
}

function buildDownloadText({
  question,
  yearLevel,
  topic,
  subject,
  dominantLanguage,
  classProfile,
  vocabulary,
  plan,
  meta,
}: {
  question: string;
  yearLevel: string;
  topic: string;
  subject: string;
  dominantLanguage: string;
  classProfile: string;
  vocabulary: string[];
  plan: BuilderPlan;
  meta: BuilderMeta | null;
}): string {
  const lines: string[] = [];
  lines.push('DIALOGIC SCAFFOLDING MAP');
  lines.push('========================');
  lines.push(`Question: ${question}`);
  lines.push(`Year Level: ${yearLevel}`);
  lines.push(`Topic: ${topic}`);
  lines.push(`Subject: ${subject}`);
  lines.push(`Dominant Language: ${dominantLanguage}`);
  lines.push(`Class Profile: ${classProfile}`);
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
  lines.push(`Model used: ${meta?.modelUsed || 'unknown'}`);
  lines.push(`Generated mode: ${meta?.mode || 'unknown'}`);
  lines.push(`Cache hit: ${meta?.fromCache ? 'yes' : 'no'}`);

  return lines.join('\n');
}

export default function TalkMoveBuilder({ onBack }: TalkMoveBuilderProps) {
  const { t } = useLang();
  const [question, setQuestion] = useState('');
  const [yearLevel, setYearLevel] = useState('1');
  const [topic, setTopic] = useState('science');
  const [subject, setSubject] = useState('science');
  const [dominantLanguage, setDominantLanguage] = useState('english');
  const [classProfile, setClassProfile] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [vocabularyText, setVocabularyText] = useState('texture, material, production');
  const [builderInput, setBuilderInput] = useState<BuilderInput>({
    subject: 'science',
    dominantLanguage: 'english',
  });
  const [plan, setPlan] = useState<BuilderPlan | null>(null);
  const [meta, setMeta] = useState<BuilderMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vocabulary = useMemo(
    () =>
      vocabularyText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [vocabularyText],
  );

  const fetchClassProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await fetch('/api/generate-class-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: builderInput.subject,
          yearLevel,
          dominantLanguage: builderInput.dominantLanguage,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.profile) {
        setClassProfile(payload.profile);
      }
    } catch {
      // silent — user can still type manually
    } finally {
      setProfileLoading(false);
    }
  }, [builderInput.subject, yearLevel, builderInput.dominantLanguage]);

  useEffect(() => {
    const timer = setTimeout(fetchClassProfile, 600);
    return () => clearTimeout(timer);
  }, [fetchClassProfile]);

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
          topic,
          subject: builderInput.subject,
          dominantLanguage: builderInput.dominantLanguage,
          classProfile,
          vocabulary,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || t('builder.errors.generateFailed'));
      }
      setPlan(payload.plan as BuilderPlan);
      setMeta((payload.meta || null) as BuilderMeta | null);
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
      topic,
      subject: builderInput.subject,
      dominantLanguage: builderInput.dominantLanguage,
      classProfile,
      vocabulary,
      plan,
      meta,
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-6xl px-4 sm:px-6 py-4 sm:py-6"
    >
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-ink/15 bg-parchment-light px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-parchment touch-target"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('builder.back')}
        </button>
        <div className="text-right">
          <p className="label-section">{t('builder.tagline')}</p>
          <h1 className="heading-editorial" style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1" }}>
            {t('builder.title')}
          </h1>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="card-warm p-4 sm:p-5 md:p-6">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t('builder.questionLabel')}
            </span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="min-h-28 w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
              placeholder={t('builder.questionPlaceholder')}
            />
          </label>

          <Field label={t('builder.topicLabel')} value={topic} onChange={setTopic} />

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t('builder.languageLabel')}
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Subject</label>
                <select
                  value={builderInput.subject}
                  onChange={(event) =>
                    setBuilderInput((prev) => ({ ...prev, subject: event.target.value }))
                  }
                  className="w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
                >
                  {subjects.map((subjectOption) => (
                    <option key={subjectOption} value={subjectOption}>
                      {subjectOption.charAt(0).toUpperCase() + subjectOption.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Year Level</label>
                <select
                  value={yearLevel}
                  onChange={(event) => setYearLevel(event.target.value)}
                  className="w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
                >
                  {yearLevels.map((yearLevelOption) => (
                    <option key={yearLevelOption} value={yearLevelOption}>
                      Year {yearLevelOption}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-ink mb-2">Most Common Class Language</label>
                <select
                  value={builderInput.dominantLanguage}
                  onChange={(event) =>
                    setBuilderInput((prev) => ({
                      ...prev,
                      dominantLanguage: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
                >
                  {languages.map((languageOption) => (
                    <option key={languageOption} value={languageOption}>
                      {languageOption.charAt(0).toUpperCase() + languageOption.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </label>

          <Field
            label={t('builder.vocabularyLabel')}
            value={vocabularyText}
            onChange={setVocabularyText}
          />

          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t('builder.classProfileLabel')}
              {profileLoading ? <LoaderCircle className="ml-2 inline h-3 w-3 animate-spin text-ink-muted" /> : null}
            </span>
            <textarea
              value={classProfile}
              onChange={(event) => setClassProfile(event.target.value)}
              className="min-h-20 w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary inline-flex items-center gap-2 rounded-lg touch-target disabled:opacity-70"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {loading ? t('builder.generating') : t('builder.generate')}
          </button>
          {meta ? (
            <p className="text-xs text-ink-muted">
              {t('builder.modelLabel')} <span className="font-mono">{meta.modelUsed}</span> ·{' '}
              {meta.fromCache ? t('builder.cached') : t('builder.fresh')}
            </p>
          ) : null}
        </div>
      </form>

      {plan ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-4 sm:mt-6"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-ink">{t('builder.outputTitle')}</h2>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg border border-ink/20 bg-white/70 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white touch-target"
            >
              <Download className="h-4 w-4" />
              {t('builder.downloadTxt')}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-2">{t('builder.bridgeColumn')}</p>
              <p className="text-sm text-ink-soft mb-3">{plan.coreQuestion.bridgeMalayOrSarawak}</p>
              <CopyLine label={t('builder.revoiceBridge')} value={plan.talkMove1Revoicing.teacherSaysBridgeMalayOrSarawak} />
              <CopyLine label={t('builder.reasoningMalay')} value={plan.talkMove2PressReasoning.questionMalay} />

              <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('builder.anticipatedAnswers')}
              </p>
              <ul className="space-y-2 text-sm text-ink-soft">
                {plan.anticipatedAnswers.map((item, idx) => (
                  <li key={`${item.likelyIbanOrSarawakMalay}-${idx}`} className="rounded-lg border border-ink/10 bg-white/50 px-3 py-2">
                    <p>{item.likelyIbanOrSarawakMalay}</p>
                    {item.conceptGap ? (
                      <p className="mt-1 text-xs text-ink-muted">
                        {t('builder.conceptGap')}: {item.conceptGap}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>

              <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('builder.codeswitch')}
              </p>
              <ul className="space-y-1.5 text-sm text-ink-soft">
                <li>{plan.codeSwitchingStrategy.whenToUseBridgeLanguage}</li>
                <li>{plan.codeSwitchingStrategy.whenToReturnEnglish}</li>
                <li>{plan.codeSwitchingStrategy.comfortMove}</li>
              </ul>
            </section>

            <section className="card-warm p-4 sm:p-5">
              <p className="label-section mb-2">{t('builder.englishColumn')}</p>
              <p className="text-sm text-ink-soft mb-3">{plan.coreQuestion.clearEnglish}</p>
              <CopyLine label={t('builder.revoiceEnglish')} value={plan.talkMove1Revoicing.teacherSaysEnglish} />
              <CopyLine label={t('builder.reasoningEnglish')} value={plan.talkMove2PressReasoning.questionEnglish} />

              <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('builder.targetVocab')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {plan.targetVocabulary.map((word) => (
                  <span
                    key={word}
                    className="rounded-full border border-ink/10 bg-white/50 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-ink-soft"
                  >
                    {word}
                  </span>
                ))}
              </div>

              <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('builder.followUpMap')}
              </p>
              <ol className="space-y-2 text-sm text-ink-soft">
                {plan.followUpMap.map((step, idx) => (
                  <li key={`${step.studentAnswerType}-${idx}`} className="rounded-lg border border-ink/10 bg-white/50 px-3 py-2">
                    <p className="font-semibold text-ink">{step.studentAnswerType}</p>
                    <p>{step.teacherMove}</p>
                    <p className="mt-1 text-xs">
                      EN: {step.nextQuestionEnglish}
                    </p>
                    <p className="text-xs">
                      MS: {step.nextQuestionMalay}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <section className="card-warm mt-3 sm:mt-4 p-4 sm:p-5">
            <p className="label-section mb-2">{t('builder.quickLines')}</p>
            <ul className="space-y-2 text-sm text-ink-soft">
              {plan.quickBoardReadyLines.map((line, idx) => (
                <li
                  key={`${line}-${idx}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-ink/10 bg-white/50 px-3 py-2"
                >
                  <span className="flex-1">{line}</span>
                  <button
                    type="button"
                    onClick={() => copyText(line)}
                    className="inline-flex items-center gap-1 rounded border border-ink/15 px-2 py-1 text-[11px] font-semibold text-ink-muted hover:bg-white"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {t('builder.copy')}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </motion.div>
      ) : null}
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
      />
    </label>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const { t } = useLang();
  if (!value) return null;
  return (
    <div className="rounded-lg border border-ink/10 bg-white/50 px-3 py-2">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm text-ink-soft">{value}</p>
        <button
          type="button"
          onClick={() => copyText(value)}
          className="inline-flex items-center gap-1 rounded border border-ink/15 px-2 py-1 text-[11px] font-semibold text-ink-muted hover:bg-white"
        >
          <Copy className="h-3.5 w-3.5" />
          {t('builder.copy')}
        </button>
      </div>
    </div>
  );
}