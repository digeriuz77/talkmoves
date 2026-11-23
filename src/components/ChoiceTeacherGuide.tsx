// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import type { ChoiceTeacherGuide as ChoiceTeacherGuideModel } from '../data/choice-scenarios';
import { useLang } from '../lib/i18n';

type ChoiceTeacherGuideProps = {
  guide: ChoiceTeacherGuideModel;
  lang: 'en' | 'ms';
};

function pick(lang: 'en' | 'ms', en?: string[], ms?: string[]): string[] {
  if (lang === 'ms') return ms ?? en ?? [];
  return en ?? [];
}

export function ChoiceTeacherGuideContent({ guide, lang }: ChoiceTeacherGuideProps) {
  const { t } = useLang();

  const vocabulary = pick(lang, guide.keyVocabulary, guide.keyVocabularyMs);
  const anticipatedAnswers = pick(lang, guide.anticipatedAnswers, guide.anticipatedAnswersMs);
  const followUpChain = pick(lang, guide.followUpChain, guide.followUpChainMs);
  const bridgePrompt = lang === 'ms' ? guide.bridgePromptMs ?? guide.bridgePrompt : guide.bridgePrompt;

  if (
    vocabulary.length === 0 &&
    anticipatedAnswers.length === 0 &&
    followUpChain.length === 0 &&
    !bridgePrompt
  ) {
    return null;
  }

  return (
    <div className="space-y-3">
      {vocabulary.length > 0 ? (
        <section>
          <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-200">
            {t('guide.vocabulary')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {vocabulary.map((word) => (
              <span
                key={word}
                className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-100"
              >
                {word}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {anticipatedAnswers.length > 0 ? (
        <section>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-200">
            {t('guide.anticipated')}
          </p>
          <ul className="space-y-1 text-xs leading-relaxed text-white/80">
            {anticipatedAnswers.map((answer) => (
              <li key={answer} className="ml-4 list-disc">
                {answer}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {followUpChain.length > 0 ? (
        <section>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-200">
            {t('guide.followUp')}
          </p>
          <ol className="space-y-1 text-xs leading-relaxed text-white/80">
            {followUpChain.map((step) => (
              <li key={step} className="ml-4 list-decimal">
                {step}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {bridgePrompt ? (
        <section>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-200">
            {t('guide.bridge')}
          </p>
          <p className="text-xs leading-relaxed text-white/80">{bridgePrompt}</p>
        </section>
      ) : null}
    </div>
  );
}

export default function ChoiceTeacherGuide({ guide, lang }: ChoiceTeacherGuideProps) {
  const { t } = useLang();
  const content = <ChoiceTeacherGuideContent guide={guide} lang={lang} />;

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-xl border border-white/15 bg-white/10 px-3 py-2 font-display text-xs font-semibold text-white/90 transition hover:bg-white/15 [&::-webkit-details-marker]:hidden touch-target">
        {t('guide.summary')}
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 max-h-80 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border-2 border-white/15 bg-[#231d19] p-4 shadow-xl">
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-white/60">
          {t('guide.title')}
        </p>
        {content}
      </div>
    </details>
  );
}
