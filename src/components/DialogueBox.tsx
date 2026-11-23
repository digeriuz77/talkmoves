// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { motion } from 'motion/react';
import { Clock, Lightbulb } from 'lucide-react';
import { Node, Move } from './Game';
import { getResponseTypeMeta } from '../lib/teacher-coaching';
import { useLang } from '../lib/i18n';
import { StudentFaceBadge } from './StudentAvatar';

export default function DialogueBox({
  node,
  onChoice,
  speakerLabel,
  speakerId,
  disabled = false,
  layout = 'panel',
}: {
  node: Node;
  onChoice: (choice: Move) => void;
  speakerLabel?: string;
  speakerId?: string;
  disabled?: boolean;
  layout?: 'overlay' | 'panel';
}) {
  const { t } = useLang();
  const responseMeta = node.responseType ? getResponseTypeMeta(node.responseType) : null;
  const isPanel = layout === 'panel';

  return (
    <div
      className={`${isPanel ? 'relative flex-1' : 'absolute bottom-0 left-0 right-0 z-30'} flex flex-col bg-[#272220]`}
    >
      <div className="flex-1 overflow-y-auto px-3 py-3.5 sm:px-5 sm:py-5 pb-safe">
        <div className="mx-auto max-w-4xl">
          <motion.div
            key={node.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-3.5"
          >
            {/* 1. STUDENT SPEECH FIRST */}
            <div className="rounded-2xl border-2 border-white/15 bg-[#332c28] p-4 shadow-md">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                {speakerLabel ? (
                  <StudentFaceBadge
                    studentId={speakerId}
                    name={speakerLabel}
                    isSpeaking
                  />
                ) : null}

                {responseMeta ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 font-display text-xs font-semibold text-sky-100">
                    <Lightbulb className="h-3.5 w-3.5 text-sky-300" aria-hidden />
                    {t(responseMeta.labelKey)}
                  </span>
                ) : null}
              </div>

              <p
                className="text-base font-semibold leading-relaxed text-white sm:text-lg"
                style={{ wordBreak: 'break-word' }}
              >
                {node.text}
              </p>

              {node.pressureCue || responseMeta ? (
                <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-2.5 sm:flex-row sm:items-start">
                  {node.pressureCue ? (
                    <div className="flex flex-1 items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/12 px-3 py-2 text-xs font-semibold text-amber-100">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                      <span>{node.pressureCue}</span>
                    </div>
                  ) : null}

                  {responseMeta ? (
                    <details className="group flex-1 rounded-xl border border-sky-400/25 bg-sky-500/10 sm:max-w-xs">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 font-display text-xs font-semibold text-sky-200 [&::-webkit-details-marker]:hidden touch-target">
                        <Lightbulb className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden />
                        <span>{t('dialogue.tapForTip')}</span>
                      </summary>
                      <p className="border-t border-sky-400/15 px-3 py-2 text-xs leading-relaxed text-sky-100/90">
                        {t(responseMeta.coachingKey)}
                      </p>
                    </details>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* 2. SPOILER-FREE TACTILE CHOICE CARDS */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              {node.choices.map((choice, idx) => {
                const body = choice.text.replace(/^\s*\[[^\]]+\]\s*/, '');
                return (
                  <motion.button
                    key={`${idx}-${choice.moveType}`}
                    type="button"
                    disabled={disabled}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => onChoice(choice)}
                    className="flex items-start gap-3 rounded-2xl border-2 border-white/18 bg-white/[0.08] px-4 py-3.5 text-left shadow-[0_3px_0_rgba(0,0,0,0.28)] transition hover:border-amber-300/60 hover:bg-white/[0.13] disabled:opacity-60 touch-target"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 font-display text-xs font-bold text-amber-200">
                      {idx + 1}
                    </span>
                    <span
                      className="flex-1 text-[0.95rem] font-semibold leading-snug text-white"
                      style={{ wordBreak: 'break-word' }}
                    >
                      {body}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
