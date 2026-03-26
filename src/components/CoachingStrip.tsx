import { motion } from 'motion/react';
import { MessageSquare, X } from 'lucide-react';

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
      transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
      className={`overflow-hidden rounded-lg border border-amber-400/20 backdrop-blur-sm ${className}`}
      style={{ background: 'linear-gradient(135deg, rgba(212,149,43,0.12) 0%, rgba(196,92,60,0.08) 100%)' }}
    >
      <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'rgba(212, 149, 43, 0.15)' }}
        >
          <MessageSquare className="h-4 w-4" style={{ color: '#d4952b' }} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'rgba(212, 149, 43, 0.8)' }}
          >
            Program response
          </p>
          <p className="mt-1 text-sm leading-snug text-white/90" style={{ wordBreak: 'break-word' }}>
            {message}
          </p>
        </div>
        {/* 44px touch target on dismiss */}
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-2.5 text-white/40 transition-colors touch-target hover:bg-white/10 hover:text-white/80"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
