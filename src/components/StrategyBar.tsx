// Core 6 Strategy (S1–S6) selector pill bar. Rendered at the top of every coaching tool; the
// chosen strategy is sent as `activeStrategy` to every coaching endpoint.
import { ChevronDown, Target } from 'lucide-react';
import { CORE6_STRATEGIES, strategyBadgeLabel } from '../lib/core6-strategies';
import { useLang } from '../lib/i18n';
import { useActiveStrategy } from '../lib/strategy-context';

export default function StrategyBar() {
  const { t } = useLang();
  const { activeStrategy, strategy, setActiveStrategy } = useActiveStrategy();

  return (
    <section
      aria-label={t('strategy.aria')}
      className="mb-3 rounded-2xl border-2 border-ink/10 bg-parchment-light/95 px-3 py-2 shadow-[0_2px_0_rgba(39,34,32,0.06)] print:hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-extrabold uppercase tracking-wide text-ink-muted">
          {t('strategy.label')}
          <span className="font-semibold normal-case tracking-normal"> · {t('strategy.spine')}</span>
        </p>
        {strategy ? (
          <span className="pill-terracotta">
            {t('strategy.spotlight')}: {strategyBadgeLabel(strategy)}
          </span>
        ) : null}
      </div>

      <div
        role="group"
        aria-label={t('strategy.label')}
        className="no-scrollbar -mx-1 mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
      >
        <button
          type="button"
          aria-pressed={!strategy}
          onClick={() => setActiveStrategy('')}
          title={t('strategy.generalHint')}
          className={`min-h-[40px] shrink-0 rounded-full border-2 px-3.5 py-1.5 font-display text-xs font-bold transition touch-target ${
            !strategy
              ? 'border-ink bg-ink text-white'
              : 'border-ink/12 bg-white text-ink-soft hover:border-ink/30'
          }`}
        >
          {t('strategy.general')}
        </button>
        {CORE6_STRATEGIES.map((item) => {
          const active = activeStrategy === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveStrategy(item.id)}
              title={`${item.name} — ${item.window}`}
              className={`min-h-[40px] shrink-0 rounded-full border-2 px-3.5 py-1.5 font-display text-xs font-bold transition touch-target ${
                active
                  ? 'border-terracotta bg-terracotta text-white shadow-[0_2px_0_#a33a1b]'
                  : 'border-ink/12 bg-white text-ink-soft hover:border-ink/30'
              }`}
            >
              <span className={active ? 'text-white/85' : 'text-terracotta'}>{item.id}</span> {item.shortName}
            </button>
          );
        })}
      </div>

      {strategy ? (
        <details className="group mt-2 border-t border-ink/10 pt-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 touch-target [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 text-sm font-bold leading-snug text-ink">
              {strategy.id} · {strategy.name}{' '}
              <span className="font-semibold text-ink-muted">— {strategy.window}</span>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>

          <div className="mt-2 space-y-2.5 text-sm">
            <div>
              <p className="label-section">{t('strategy.mechanism')}</p>
              <p className="mt-0.5 font-semibold leading-snug text-ink-soft">{strategy.mechanism}</p>
            </div>
            <div>
              <p className="label-section">{t('strategy.teacherMove')}</p>
              <p className="mt-0.5 flex items-start gap-2 rounded-xl border-2 border-terracotta/25 bg-terracotta-bg/60 px-3 py-2">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" aria-hidden />
                <span className="font-bold leading-snug text-ink">
                  “{strategy.teacherMoveQuote}”{' '}
                  <span className="font-display text-xs font-semibold text-terracotta">
                    ({strategy.teacherMoveRef})
                  </span>
                </span>
              </p>
            </div>
            <div>
              <p className="label-section">{t('strategy.pupilTarget')}</p>
              <p className="mt-0.5 font-semibold leading-snug text-ink-soft">{strategy.pupilTarget}</p>
            </div>
          </div>

          <p className="mt-2 text-xs font-semibold leading-snug text-ink-muted">
            {t('strategy.activeHint')} {t('strategy.cumulative')}
          </p>
        </details>
      ) : (
        <p className="mt-1.5 text-xs font-semibold leading-snug text-ink-soft">{t('strategy.generalHint')}</p>
      )}
    </section>
  );
}
