// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { motion } from 'motion/react';
import { ArrowRight, Mail } from 'lucide-react';
import { useLang } from '../lib/i18n';
import TalkMovesLogo from './TalkMovesLogo';

const EMAIL = 'gstanyard@gmail.com';

type LandingProps = {
  onEnter: () => void;
};

export default function Landing({ onEnter }: LandingProps) {
  const { t, lang, setLang } = useLang();

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-parchment px-4 py-8 font-body text-ink">
      {/* Compact EN|BM switcher in top-right (never overlaps CTA) */}
      <div
        role="group"
        aria-label={t('lang.aria')}
        className="absolute right-4 top-4 inline-flex overflow-hidden rounded-full border-2 border-ink/15 bg-parchment-light p-0.5 shadow-sm"
      >
        <button
          type="button"
          onClick={() => setLang('en')}
          aria-pressed={lang === 'en'}
          className={`min-h-[38px] min-w-[42px] rounded-full px-3 font-display text-xs font-bold transition ${
            lang === 'en' ? 'bg-terracotta text-white shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang('ms')}
          aria-pressed={lang === 'ms'}
          className={`min-h-[38px] min-w-[42px] rounded-full px-3 font-display text-xs font-bold transition ${
            lang === 'ms' ? 'bg-terracotta text-white shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
        >
          BM
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card-warm mx-auto w-full max-w-md p-6 text-center sm:p-8"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-[#b84422] bg-terracotta text-white shadow-[0_4px_0_#a33a1b]">
          <TalkMovesLogo className="h-9 w-9" />
        </div>

        <p className="pill-amber mb-3 inline-block">{t('landing.tagline')}</p>

        <h1 className="heading-editorial mb-3">{t('landing.title')}</h1>

        <p className="text-body mx-auto mb-6 max-w-sm">{t('landing.welcome')}</p>

        <button
          type="button"
          onClick={onEnter}
          className="btn-primary inline-flex w-full items-center justify-center gap-2 text-base touch-target sm:w-auto sm:px-8"
        >
          {t('landing.enter')}
          <ArrowRight className="h-5 w-5" />
        </button>

        <div className="rule-editorial mx-auto my-6 max-w-[180px]" />

        <div className="space-y-1">
          <p className="text-xs font-bold text-ink-muted">{t('landing.contact')}</p>
          <a
            href={`mailto:${EMAIL}`}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-display text-sm font-semibold text-terracotta transition hover:bg-terracotta-bg touch-target"
          >
            <Mail className="h-4 w-4" />
            {EMAIL}
          </a>
        </div>
      </motion.div>
    </div>
  );
}
