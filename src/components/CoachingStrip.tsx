import { motion } from 'motion/react';
import { MessageSquare, X } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function CoachingStrip({
  message,
  onDismiss,
  className = '',
}: {
  message: string;
  onDismiss: () => void;
  className?: string;
}) {
  const { t } = useLang();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
      className={`overflow-hidden rounded-2xl border-2 border-amber-400/35 backdrop-blur-sm ${className}`}
      style={{ background: 'linear-gradient(135deg, rgba(217,138,22,0.16) 0%, rgba(217,93,57,0.12) 100%)' }}
    >
      <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(240, 173, 56, 0.2)' }}
        >
          <MessageSquare className="h-4 w-4 text-amber-300" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] font-bold uppercase tracking-wider text-amber-300">
            {t('coaching.programResponse')}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-white/95" style={{ wordBreak: 'break-word' }}>
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-2.5 text-white/40 transition-colors touch-target hover:bg-white/10 hover:text-white/80"
          aria-label={t('coaching.dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
