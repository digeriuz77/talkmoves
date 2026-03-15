import { motion } from 'motion/react';
import { MessageSquare, X } from 'lucide-react';

/**
 * Program response after a move — always visible until dismissed.
 * Uses 4px grid (12/16px padding), 8px radius, clear hierarchy per design-principles.
 */
export default function CoachingStrip({
  message,
  onDismiss,
  className = '',
}: {
  message: string;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
      className={`overflow-hidden rounded-lg border border-amber-500/25 bg-amber-950/95 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
          <MessageSquare className="h-4 w-4 text-amber-400" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200/90">
            Program response
          </p>
          <p className="mt-2 text-sm leading-snug text-amber-50 sm:text-base">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-2 text-amber-200/60 transition-colors hover:bg-white/10 hover:text-amber-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
