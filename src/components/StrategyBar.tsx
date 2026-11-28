// Assisted-by: Antigravity:gemini-4-neon (2026-11-28)
// Unified quiet setup strip: shows Year · Subject · Language · Core 6 Focus on one calm line.
// Expands on tap so setup controls stay out of the way of the primary classroom action.
import { useState } from 'react';
import { Check, ChevronDown, SlidersHorizontal, Target } from 'lucide-react';
import {
  CORE6_STRATEGIES,
  localizeStrategy,
  strategyBadgeLabel,
} from '../lib/core6-strategies';
import { useLang } from '../lib/i18n';
import { useActiveStrategy } from '../lib/strategy-context';
import { useClassContext } from '../lib/class-context';
import { SelectField, languages, subjectLabel, subjects, yearLevels } from './coach-ui';

function formatLanguageLabel(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function StrategyBar({ includeClassContext = true }: { includeClassContext?: boolean }) {
  const { t, lang } = useLang();
  const { activeStrategy, strategy, setActiveStrategy } = useActiveStrategy();
  const { yearLevel, subject, dominantLanguage, setYearLevel, setSubject, setDominantLanguage } =
    useClassContext();
  const [open, setOpen] = useState(false);

  const localizedActive = strategy ? localizeStrategy(strategy, lang) : null;

  return (
    <section
      aria-label={t('strategy.aria')}
      className="mb-3 rounded-2xl border border-ink/10 bg-parchment-light/80 px-3 py-2 print:hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold text-ink-muted">
          {includeClassContext ? (
            <>
              <span className="font-display text-ink">
                {lang === 'ms' ? `Tahun ${yearLevel}` : `Year ${yearLevel}`}
              </span>
              <span aria-hidden>·</span>
              <span>{subjectLabel(subject)}</span>
              <span aria-hidden>·</span>
              <span>{formatLanguageLabel(dominantLanguage)}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          {strategy ? (
            <span className="rounded-full bg-terracotta/12 px-2.5 py-0.5 font-display text-xs font-bold text-terracotta">
              {strategyBadgeLabel(strategy, lang)}
            </span>
          ) : (
            <span className="rounded-full bg-parchment-dark px-2.5 py-0.5 font-display text-xs font-semibold text-ink-soft">
              {t('strategy.general')}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-2.5 py-1.5 font-display text-xs font-semibold text-ink-soft transition hover:border-terracotta/40 hover:text-ink touch-target"
        >
          {open ? (
            <Check className="h-3.5 w-3.5 text-sage" aria-hidden />
          ) : (
            <SlidersHorizontal className="h-3.5 w-3.5 text-terracotta" aria-hidden />
          )}
          {open ? t('classContext.done') : t('classContext.edit')}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-ink/10 pt-3">
          {/* Core 6 Strategy Pills (100% localized in EN and BM) */}
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
              {t('strategy.label')}
            </p>
            <div
              role="group"
              aria-label={t('strategy.label')}
              className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
            >
              <button
                type="button"
                aria-pressed={!strategy}
                onClick={() => setActiveStrategy('')}
                className={`min-h-[38px] shrink-0 rounded-full border-2 px-3 py-1 font-display text-xs font-bold transition touch-target ${
                  !strategy
                    ? 'border-ink bg-ink text-white'
                    : 'border-ink/12 bg-white text-ink-soft hover:border-ink/30'
                }`}
              >
                {t('strategy.general')}
              </button>
              {CORE6_STRATEGIES.map((item) => {
                const active = activeStrategy === item.id;
                const loc = localizeStrategy(item, lang);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveStrategy(item.id)}
                    title={`${loc.name} — ${loc.window}`}
                    className={`min-h-[38px] shrink-0 rounded-full border-2 px-3 py-1 font-display text-xs font-bold transition touch-target ${
                      active
                        ? 'border-terracotta bg-terracotta text-white'
                        : 'border-ink/12 bg-white text-ink-soft hover:border-ink/30'
                    }`}
                  >
                    <span className={active ? 'text-white/85' : 'text-terracotta'}>{item.id}</span> {loc.shortName}
                  </button>
                );
              })}
            </div>

            {strategy && localizedActive ? (
              <details className="group mt-2 rounded-xl border border-ink/10 bg-white/80 px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-ink [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    {strategy.id} · {localizedActive.name}{' '}
                    <span className="font-semibold text-ink-muted">({localizedActive.window})</span>
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="mt-2 space-y-2 border-t border-ink/10 pt-2 text-xs">
                  <div>
                    <p className="font-bold uppercase tracking-wide text-ink-muted">{t('strategy.mechanism')}</p>
                    <p className="mt-0.5 leading-snug text-ink-soft">{localizedActive.mechanism}</p>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl bg-terracotta-bg/60 px-2.5 py-2">
                    <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terracotta" aria-hidden />
                    <span className="font-bold leading-snug text-ink">“{localizedActive.teacherMoveQuote}”</span>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wide text-ink-muted">{t('strategy.pupilTarget')}</p>
                    <p className="mt-0.5 leading-snug text-ink-soft">{localizedActive.pupilTarget}</p>
                  </div>
                </div>
              </details>
            ) : null}
          </div>

          {includeClassContext ? (
            <div className="grid grid-cols-1 gap-2.5 border-t border-ink/10 pt-2.5 sm:grid-cols-3">
              <SelectField
                label={t('live.yearLabel')}
                value={yearLevel}
                onChange={setYearLevel}
                options={yearLevels.map((y) => ({
                  value: y,
                  label: lang === 'ms' ? `Tahun ${y}` : `Year ${y}`,
                }))}
              />
              <SelectField
                label={t('live.subjectLabel')}
                value={subject}
                onChange={setSubject}
                options={subjects.map((s) => ({ value: s, label: subjectLabel(s) }))}
              />
              <SelectField
                label={t('live.languageLabel')}
                value={dominantLanguage}
                onChange={setDominantLanguage}
                options={languages.map((l) => ({ value: l, label: formatLanguageLabel(l) }))}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
