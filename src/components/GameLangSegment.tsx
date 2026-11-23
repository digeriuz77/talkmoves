import { Languages } from 'lucide-react';
import { useLang } from '../lib/i18n';

/** Compact EN/BM control for the in-game header (dark chrome). */
export default function GameLangSegment() {
  const { lang, setLang, t } = useLang();

  return (
    <div
      role="group"
      aria-label={t('lang.aria')}
      className="flex shrink-0 items-stretch overflow-hidden rounded-full border-2 border-white/15 bg-white/10 p-0.5 font-display text-xs font-bold text-white"
    >
      <span className="hidden items-center px-2 text-amber-300 sm:flex" aria-hidden>
        <Languages className="h-3.5 w-3.5" />
      </span>
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        title={t('lang.segmentEn')}
        className={`min-h-[36px] min-w-[38px] rounded-full px-2.5 transition ${lang === 'en' ? 'bg-terracotta text-white shadow-sm' : 'text-white/65 hover:text-white'}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ms')}
        aria-pressed={lang === 'ms'}
        title={t('lang.segmentMs')}
        className={`min-h-[36px] min-w-[38px] rounded-full px-2.5 transition ${lang === 'ms' ? 'bg-terracotta text-white shadow-sm' : 'text-white/65 hover:text-white'}`}
      >
        BM
      </button>
    </div>
  );
}
