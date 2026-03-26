/**
 * Landing page — editorial hero with warm scholarly palette.
 * Centered layout with generous whitespace, decorative rules,
 * and Fraunces display type.
 */
import { motion } from 'motion/react';
import { ArrowRight, Mail } from 'lucide-react';

const WELCOME =
  'Welcome to Talk Moves. These are short scenarios to help teachers think about dialogic practice in the classroom.';
const CONTACT = 'For further levels, contact Gary at:';
const EMAIL = 'gstanyard@gmail.com';

type LandingProps = {
  onEnter: () => void;
};

export default function Landing({ onEnter }: LandingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="mx-auto max-w-lg px-6 text-center"
    >
      {/* Decorative top rule */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
        className="mx-auto mb-8 h-[3px] w-16 rounded-full bg-terracotta"
      />

      {/* Issue marker */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="label-section mb-4"
      >
        Dialogic Teaching Practice
      </motion.p>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="heading-editorial mb-6 text-4xl sm:text-5xl md:text-6xl"
        style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1" }}
      >
        Talk Moves
      </motion.h1>

      {/* Subtitle rule */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        className="rule-editorial mx-auto mb-6 max-w-xs"
      />

      {/* Welcome text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="text-body mx-auto mb-8 max-w-md"
      >
        {WELCOME}
      </motion.p>

      {/* Enter button */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        <button
          type="button"
          onClick={onEnter}
          className="btn-primary inline-flex items-center gap-2.5 rounded-lg px-7 py-3.5 text-[0.9375rem]"
        >
          Enter
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>

      {/* Bottom rule */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.75, duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        className="rule-editorial mx-auto mt-10 mb-5 max-w-[200px]"
      />

      {/* Contact */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85 }}
        className="space-y-2"
      >
        <p className="text-sm text-ink-muted">{CONTACT}</p>
        <a
          href={`mailto:${EMAIL}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta transition-colors hover:text-terracotta-soft"
        >
          <Mail className="h-3.5 w-3.5" />
          {EMAIL}
        </a>
      </motion.div>
    </motion.div>
  );
}
