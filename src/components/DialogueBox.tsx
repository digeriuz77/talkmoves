import { AnimatePresence, motion } from 'motion/react';
import { Node, Move } from './Game';
import { getResponseTypeMeta } from '../lib/teacher-coaching';
import CoachingStrip from './CoachingStrip';

/**
 * Dialogue panel: program response (when present) stays pinned at top so it's
 * always visible on mobile; content below scrolls. 4px grid, 8/12px radius.
 */
export default function DialogueBox({
  node,
  onChoice,
  feedback,
  onDismissFeedback,
  speakerLabel,
}: {
  node: Node;
  onChoice: (choice: Move) => void;
  feedback?: string | null;
  onDismissFeedback?: () => void;
  speakerLabel?: string;
}) {
  const responseMeta = node.responseType ? getResponseTypeMeta(node.responseType) : null;
  const showProgramResponse = Boolean(feedback && onDismissFeedback);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex max-h-[70vh] flex-col border-t border-white/10 bg-black/95 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] backdrop-blur-sm">
      {/* Program response: fixed at top of panel so it never scrolls away on mobile */}
      <AnimatePresence mode="wait">
        {showProgramResponse ? (
          <div key="program-response" className="shrink-0 border-b border-white/10 bg-black/90 px-4 py-3">
            <CoachingStrip message={feedback!} onDismiss={onDismissFeedback!} />
          </div>
        ) : null}
      </AnimatePresence>

      {/* Scrollable dialogue content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-5xl">
          <motion.div
            key={node.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
            className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start lg:gap-6"
          >
            <aside className="order-1 flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 lg:order-2 lg:sticky lg:top-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                Context
              </p>
              {node.pressureCue ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-100/90">
                  <span className="font-semibold text-amber-200/90">Time pressure · </span>
                  {node.pressureCue}
                </div>
              ) : (
                <p className="text-xs text-white/40">No extra pressure cue this turn.</p>
              )}

              {responseMeta ? (
                <details className="group rounded-lg border border-sky-500/20 bg-sky-500/10">
                  <summary className="cursor-pointer list-none px-3 py-2 text-left [&::-webkit-details-marker]:hidden">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-200/70">
                      Response type
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-sky-50">
                      {responseMeta.label}
                    </span>
                    <span className="mt-1 block text-[11px] text-sky-200/50 group-open:hidden">
                      Tap for coaching tip
                    </span>
                  </summary>
                  <p className="border-t border-sky-500/15 px-3 py-2 text-xs leading-relaxed text-sky-100/80">
                    {responseMeta.coaching}
                  </p>
                </details>
              ) : null}
            </aside>

            <div className="order-2 min-w-0 lg:order-1">
              {speakerLabel ? (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Speaking now · <span className="text-white/70">{speakerLabel}</span>
                </p>
              ) : null}
              <p className="mb-4 text-base font-serif leading-relaxed text-white/90 sm:text-lg md:text-xl">
                {node.text}
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                {node.choices.map((choice, idx) => (
                  <motion.button
                    key={idx}
                    type="button"
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onChoice(choice)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-emerald-400/95">
                      {choice.text.match(/\[(.*?)\]/)?.[0]?.replace(/[\[\]]/g, '') ?? 'Option'}
                    </span>
                    <span className="block text-sm leading-snug text-white/80">
                      {choice.text.replace(/\[(.*?)\]\s*/, '')}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
