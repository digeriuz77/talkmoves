/**
 * Splash landing page: welcome text and contact.
 */
import { motion } from 'motion/react';
import { Mail, ArrowRight } from 'lucide-react';

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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-neutral-800/50 p-8 text-center shadow-xl"
    >
      <h1 className="mb-6 text-3xl font-serif font-bold text-white sm:text-4xl">
        Talk Moves
      </h1>
      <p className="mb-6 text-lg leading-relaxed text-white/85">{WELCOME}</p>
      <p className="mb-2 text-sm text-white/60">{CONTACT}</p>
      <a
        href={`mailto:${EMAIL}`}
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white/90 transition-colors hover:border-white/30 hover:bg-white/10"
      >
        <Mail className="h-4 w-4" />
        {EMAIL}
      </a>
      <div className="mt-8">
        <button
          type="button"
          onClick={onEnter}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-neutral-900 transition-colors hover:bg-amber-400"
        >
          Enter
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
