// Assisted-by: Antigravity:gemini-4-neon (2026-11-28)
import { motion } from 'motion/react';
import {
  ArrowRight,
  Compass,
  Dices,
  FileSearch,
  Mail,
  Target,
  Zap,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import TalkMovesLogo from './TalkMovesLogo';

const EMAIL = 'gstanyard@gmail.com';

type LandingProps = {
  onEnter: () => void;
  onTakeTour: () => void;
};

export default function Landing({ onEnter, onTakeTour }: LandingProps) {
  const { t, lang, setLang } = useLang();

  const highlights = [
    {
      icon: Zap,
      tone: 'bg-terracotta-bg text-terracotta border-terracotta/30',
      title: t('landing.feat1Title'),
      body: t('landing.feat1Body'),
    },
    {
      icon: Dices,
      tone: 'bg-amber-bg text-[#9e5f06] border-amber/35',
      title: t('landing.feat2Title'),
      body: t('landing.feat2Body'),
    },
    {
      icon: FileSearch,
      tone: 'bg-sky-bg text-[#1c5f8d] border-sky/30',
      title: t('landing.feat3Title'),
      body: t('landing.feat3Body'),
    },
    {
      icon: Target,
      tone: 'bg-sage-bg text-[#1f6b4a] border-sage/30',
      title: t('landing.feat4Title'),
      body: t('landing.feat4Body'),
    },
  ];

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-parchment px-4 py-10 font-body text-ink">
      {/* Compact EN|BM switcher in top-right */}
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
        transition={{ duration: 0.35 }}
        className="card-warm mx-auto mt-8 w-full max-w-2xl p-6 sm:mt-4 sm:p-8"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-[#b84422] bg-terracotta text-white shadow-[0_4px_0_#a33a1b]">
            <TalkMovesLogo className="h-9 w-9" />
          </div>

          <p className="pill-amber mb-3 inline-block">{t('landing.tagline')}</p>

          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t('landing.title')}
          </h1>

          <p className="mx-auto mt-2.5 max-w-lg text-base font-semibold leading-relaxed text-ink-soft sm:text-lg">
            {t('landing.welcome')}
          </p>

          {/* Dominant Primary Action + Manual Guided Tour */}
          <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={onEnter}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 px-8 py-3.5 text-base touch-target sm:w-auto"
            >
              {t('landing.enter')}
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onTakeTour}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink/15 bg-white px-5 py-3 font-display text-sm font-bold text-ink transition hover:border-terracotta/45 hover:text-terracotta touch-target sm:w-auto"
            >
              <Compass className="h-4 w-4 text-terracotta" aria-hidden />
              {t('landing.takeTour')}
            </button>
          </div>
        </div>

        {/* Concise full-app overview (4 scannable tiles) */}
        <div className="mt-7 grid grid-cols-1 gap-2.5 border-t border-ink/10 pt-6 sm:grid-cols-2">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-parchment-light/75 p-3"
              >
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.tone}`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-soft">{item.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-ink/10 pt-4 text-xs text-ink-muted">
          <span className="font-semibold">{t('landing.contact')}</span>
          <a
            href={`mailto:${EMAIL}`}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-display font-semibold text-terracotta transition hover:bg-terracotta-bg"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            {EMAIL}
          </a>
        </div>
      </motion.div>
    </div>
  );
}
