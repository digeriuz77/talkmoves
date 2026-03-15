import { AnimatePresence, motion } from 'motion/react';
import { Node, Move } from './Game';
import { getResponseTypeMeta } from '../lib/teacher-coaching';
import CoachingStrip from './CoachingStrip';

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

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-5 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <AnimatePresence mode="wait">
          {feedback && onDismissFeedback ? (
            <div key="fb" className="mb-4">
              <CoachingStrip message={feedback} onDismiss={onDismissFeedback} />
            </div>
          ) : null}
        </AnimatePresence>

        <motion.div
          key={node.text}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start lg:gap-8"
        >
          <aside className="order-1 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 lg:order-2 lg:sticky lg:top-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              Context
            </p>
            {node.pressureCue ? (
              <div className="rounded-lg border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-100/90">
                <span className="font-semibold text-amber-200/90">Time pressure · </span>
                {node.pressureCue}
              </div>
            ) : (
              <p className="text-xs text-white/35">No extra pressure cue this turn.</p>
            )}

            {responseMeta ? (
              <details className="group rounded-lg border border-sky-400/15 bg-sky-500/10 open:bg-sky-500/[0.08]">
                <summary className="cursor-pointer list-none px-3 py-2 text-left [&::-webkit-details-marker]:hidden">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-200/70">
                    Response type
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-sky-50">
                    {responseMeta.label}
                  </span>
                  <span className="mt-1 block text-[11px] text-sky-200/50 group-open:hidden">
                    Tap for coaching tip
                  </span>
                </summary>
                <p className="border-t border-sky-400/10 px-3 py-2 text-xs leading-relaxed text-sky-100/80">
                  {responseMeta.coaching}
                </p>
              </details>
            ) : null}
          </aside>

          <div className="order-2 min-w-0 lg:order-1">
            {speakerLabel ? (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                Speaking now · <span className="text-white/65">{speakerLabel}</span>
              </p>
            ) : null}
            <p className="mb-5 text-lg font-serif leading-relaxed text-white/90 sm:text-xl md:text-2xl">
              {node.text}
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              {node.choices.map((choice, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onChoice(choice)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]"
                >
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-emerald-400/95">
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
  );
}
