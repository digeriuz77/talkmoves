/**
 * Landing page ΓÇö editorial hero with warm scholarly palette.
 */
import { motion } from 'motion/react';
import { ArrowRight, Mail } from 'lucide-react';
import { useLang } from '../lib/i18n';

const EMAIL = 'gstanyard@gmail.com';

type LandingProps = {
  onEnter: () => void;
};

export default function Landing({ onEnter }: LandingProps) {
  const { t } = useLang();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="mx-auto max-w-lg px-5 sm:px-6 text-center"
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
        className="mx-auto mb-6 sm:mb-8 h-[3px] w-12 sm:w-16 rounded-full bg-terracotta"
      />

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="label-section mb-3 sm:mb-4"
      >
        {t('landing.tagline')}
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="heading-editorial mb-5 sm:mb-6"
        style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1" }}
      >
        {t('landing.title')}
      </motion.h1>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        className="rule-editorial mx-auto mb-5 sm:mb-6 max-w-[220px] sm:max-w-xs"
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="text-body mx-auto mb-6 sm:mb-8 max-w-md"
      >
        {t('landing.welcome')}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        <button
          type="button"
          onClick={onEnter}
          className="btn-primary inline-flex items-center justify-center gap-2.5 rounded-lg touch-target sm:w-auto"
        >
          {t('landing.enter')}
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.75, duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        className="rule-editorial mx-auto mt-8 sm:mt-10 mb-4 sm:mb-5 max-w-[160px] sm:max-w-[200px]"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85 }}
        className="space-y-2"
      >
        <p className="text-sm text-ink-muted">{t('landing.contact')}</p>
        <a
          href={`mailto:${EMAIL}`}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-terracotta transition-colors hover:text-terracotta-soft touch-target"
        >
          <Mail className="h-4 w-4" />
          {EMAIL}
        </a>
      </motion.div>
    </motion.div>
  );
}
