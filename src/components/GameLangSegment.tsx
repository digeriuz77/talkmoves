import { Languages } from 'lucide-react';
import { useLang } from '../lib/i18n';

/** Compact EN/BM control for the in-game header (dark chrome). */
export default function GameLangSegment() {
  const { lang, setLang, t } = useLang();

  return (
    <div
      role="group"
      aria-label={t('lang.aria')}
      className="flex shrink-0 items-stretch overflow-hidden rounded-lg border border-white/15 bg-white/[0.06] text-[10px] font-semibold tabular-nums text-white/90 sm:text-[11px]"
    >
      <span className="flex items-center border-r border-white/10 px-1.5 text-amber-200/70 sm:px-2" aria-hidden>
        <Languages className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        title={t('lang.segmentEn')}
        className={`touch-target px-2 py-1.5 sm:px-2.5 ${lang === 'en' ? 'bg-amber-500/25 text-amber-50' : 'text-white/50 hover:bg-white/10 hover:text-white/80'}`}
      >
        EN
      </button>
      <span className="w-px shrink-0 self-stretch bg-white/10" aria-hidden />
      <button
        type="button"
        onClick={() => setLang('ms')}
        aria-pressed={lang === 'ms'}
        title={t('lang.segmentMs')}
        className={`touch-target px-2 py-1.5 sm:px-2.5 ${lang === 'ms' ? 'bg-amber-500/25 text-amber-50' : 'text-white/50 hover:bg-white/10 hover:text-white/80'}`}
      >
        BM
      </button>
    </div>
  );
}
