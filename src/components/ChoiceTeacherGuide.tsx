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

export default function ChoiceTeacherGuide({ guide, lang }: ChoiceTeacherGuideProps) {
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
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg border border-white/10 bg-white/5 px-2.5 sm:px-3 py-2 text-[10px] sm:text-[11px] font-medium text-white/70 transition-colors hover:bg-white/10 [&::-webkit-details-marker]:hidden">
        {t('guide.summary')}
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-[#2c2520]/95 p-4 shadow-lg backdrop-blur-md">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-white/45">
          {t('guide.title')}
        </p>

        {vocabulary.length > 0 ? (
          <section className="mb-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/70">
              {t('guide.vocabulary')}
            </p>
            <p className="text-xs leading-relaxed text-white/75">{vocabulary.join(' · ')}</p>
          </section>
        ) : null}

        {anticipatedAnswers.length > 0 ? (
          <section className="mb-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/70">
              {t('guide.anticipated')}
            </p>
            <ul className="space-y-1.5 text-xs leading-relaxed text-white/75">
              {anticipatedAnswers.map((answer) => (
                <li key={answer} className="list-disc ml-4">
                  {answer}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {followUpChain.length > 0 ? (
          <section className="mb-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/70">
              {t('guide.followUp')}
            </p>
            <ol className="space-y-1.5 text-xs leading-relaxed text-white/75">
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
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/70">
              {t('guide.bridge')}
            </p>
            <p className="text-xs leading-relaxed text-white/75">{bridgePrompt}</p>
          </section>
        ) : null}
      </div>
    </details>
  );
}
