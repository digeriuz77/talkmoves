import { motion } from 'motion/react';
import { Lightbulb, X } from 'lucide-react';

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
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`overflow-hidden rounded-xl border border-amber-400/20 bg-amber-950/85 ${className}`}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/85">
            After your move
          </p>
          <p className="mt-0.5 text-sm leading-snug text-amber-50/95">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-amber-200/55 hover:bg-white/10 hover:text-amber-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
