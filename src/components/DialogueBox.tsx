import { AnimatePresence, motion } from 'motion/react';
import { Node, Move } from './Game';
import { getResponseTypeMeta } from '../lib/teacher-coaching';
import CoachingStrip from './CoachingStrip';
import { useLang } from '../lib/i18n';

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
  const { t } = useLang();
  const responseMeta = node.responseType ? getResponseTypeMeta(node.responseType) : null;
  const showProgramResponse = Boolean(feedback && onDismissFeedback);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex flex-col border-t border-white/10 shadow-[0_-4px_24px_rgba(44,37,32,0.3)]"
      style={{
        background: 'rgba(44, 37, 32, 0.97)',
        maxHeight: 'min(70vh, 70dvh)',
      }}
    >
      <AnimatePresence mode="wait">
        {showProgramResponse ? (
          <div key="program-response" className="shrink-0 border-b border-white/10 px-3 sm:px-4 py-2.5 sm:py-3" style={{ background: 'rgba(44, 37, 32, 0.9)' }}>
            <CoachingStrip message={feedback!} onDismiss={onDismissFeedback!} />
          </div>
        ) : null}
      </AnimatePresence>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
        <div className="mx-auto max-w-5xl">
          <motion.div
            key={node.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start lg:gap-6"
          >
            <aside className="order-1 flex flex-col gap-3 rounded-lg border border-white/10 p-3 sm:p-4 lg:order-2 lg:sticky lg:top-0" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/50">
                {t('dialogue.context')}
              </p>
              {node.pressureCue ? (
                <div className="rounded-lg border border-amber-400/15 px-3 py-2 text-xs leading-snug text-amber-100/90" style={{ background: 'rgba(212, 149, 43, 0.08)' }}>
                  <span className="font-semibold" style={{ color: '#d4952b' }}>{t('dialogue.timePressure')} &middot; </span>
                  {node.pressureCue}
                </div>
              ) : (
                <p className="text-xs text-white/35">{t('dialogue.noPressure')}</p>
              )}

              {responseMeta ? (
                <details className="group rounded-lg border border-sky-500/15" style={{ background: 'rgba(42, 100, 140, 0.08)' }}>
                  <summary className="cursor-pointer list-none px-3 py-2.5 text-left [&::-webkit-details-marker]:hidden touch-target">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300/60">
                      {t('dialogue.responseType')}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-sky-100">
                      {t(responseMeta.labelKey)}
                    </span>
                    <span className="mt-1 block text-[11px] text-sky-300/40 group-open:hidden">
                      {t('dialogue.tapForTip')}
                    </span>
                  </summary>
                  <p className="border-t border-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-100/70">
                    {t(responseMeta.coachingKey)}
                  </p>
                </details>
              ) : null}
            </aside>

            <div className="order-2 min-w-0 lg:order-1">
              {speakerLabel ? (
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
                  {t('dialogue.speakingNow')} &middot; <span className="text-white/65">{speakerLabel}</span>
                </p>
              ) : null}
              <p className="mb-3 sm:mb-4 text-base leading-relaxed text-white/90 sm:text-lg md:text-xl" style={{ fontFamily: "'Lora', serif", wordBreak: 'break-word' }}>
                {node.text}
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                {node.choices.map((choice, idx) => (
                  <motion.button
                    key={idx}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onChoice(choice)}
                    className="rounded-lg border border-white/10 px-3 sm:px-4 py-3 text-left transition-all duration-200 touch-target hover:border-terracotta/30 hover:bg-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide" style={{ color: '#8aab8f' }}>
                      {choice.text.match(/\[(.*?)\]/)?.[0]?.replace(/[\[\]]/g, '') ?? 'Option'}
                    </span>
                    <span className="block text-sm leading-snug text-white/75" style={{ wordBreak: 'break-word' }}>
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
