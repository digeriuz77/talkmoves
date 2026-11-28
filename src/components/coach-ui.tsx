// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { useState, type ReactNode } from 'react';
import { Bot, Check, ChevronDown, ChevronUp, Copy, RotateCcw, TriangleAlert, AlertCircle } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { getStrategy, strategyBadgeLabel } from '../lib/core6-strategies';

export const subjects = ['science', 'maths', 'english', 'malay', 'social studies', 'design', 'it'];
export const yearLevels = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
export const languages = ['iban', 'sarawak malay', 'malay', 'english'];

/** Quiet one-line privacy hint shown once near open-text inputs. */
export function PrivacyNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();
  return (
    <p
      role="note"
      className={`flex items-center gap-1.5 text-xs font-medium text-ink-muted ${compact ? '' : 'mb-2.5'}`}
    >
      <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
      <span>{t('coach.privacyNotice')}</span>
    </p>
  );
}

/** Quiet AI transparency note shown on generated output cards. Kept in print output. */
export function AiNotice() {
  const { t } = useLang();
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
      <Bot className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{t('coach.aiNotice')}</span>
    </p>
  );
}

/** Pill naming the Core 6 strategy that shaped a generated output. Renders nothing when none. */
export function StrategySpotlightBadge({ strategyId }: { strategyId?: string | null }) {
  const { t, lang } = useLang();
  const strategy = getStrategy(strategyId);
  if (!strategy) return null;
  const label = strategyBadgeLabel(strategy, lang);
  return (
    <span className="pill-terracotta" title={label}>
      {t('strategy.spotlight')}: {label}
    </span>
  );
}

export function subjectLabel(value: string): string {
  if (value === 'it') return 'IT';
  return value
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export type NeedCategory = 'pacing' | 'control' | 'scaffolding' | 'mixed';
export type LangLens = 'both' | 'en' | 'l1';

const NEED_STYLES: Record<NeedCategory, string> = {
  pacing: 'border-amber/40 bg-amber-bg text-[#9e5f06]',
  control: 'border-red-300 bg-red-50 text-red-700',
  scaffolding: 'border-sky/35 bg-sky-bg text-[#1c5f8d]',
  mixed: 'border-berry/35 bg-berry-bg text-[#5a379c]',
};

export async function copyText(value: string) {
  if (!value) return;
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard API unavailable');
  }
  await navigator.clipboard.writeText(value);
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[44px] w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-base font-semibold text-ink outline-none transition focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/20 sm:text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NeedBadge({ category }: { category: NeedCategory }) {
  const { t } = useLang();
  const style = NEED_STYLES[category] || NEED_STYLES.mixed;
  return (
    <span
      className={`inline-block rounded-full border-2 px-2.5 py-0.5 font-display text-xs font-semibold ${style}`}
    >
      {t(`coach.need.${category}`)}
    </span>
  );
}

export function SayLine({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'en' | 'l1';
}) {
  if (!value) return null;
  const accent =
    tone === 'en'
      ? 'border-sky/25 bg-sky-bg/50'
      : tone === 'l1'
        ? 'border-sage/25 bg-sage-bg/50'
        : 'border-ink/12 bg-white';
  return (
    <div className={`mt-2 rounded-2xl border-2 px-3.5 py-2.5 ${accent}`}>
      <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-base font-semibold leading-snug text-ink sm:text-[0.95rem]">
          {value}
        </p>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

export function StartNewButton({ onClear }: { onClear: () => void }) {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm(t('coach.clearConfirm'))) onClear();
      }}
      className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 font-display text-xs font-semibold text-ink-muted transition hover:border-ink/30 hover:text-ink touch-target"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      {t('coach.startNew')}
    </button>
  );
}

export function CopyButton({ value }: { value: string }) {
  const { t } = useLang();
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleCopy = async () => {
    try {
      await copyText(value);
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('error');
      window.setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={status === 'copied' ? t('ui.copied') : t('builder.copy')}
      className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border-2 px-2.5 py-1.5 font-display text-xs font-semibold transition touch-target ${
        status === 'copied'
          ? 'border-sage/50 bg-sage-bg text-[#1f6b4a]'
          : status === 'error'
            ? 'border-red-300 bg-red-50 text-red-700'
            : 'border-ink/12 bg-parchment-light text-ink-muted hover:border-ink/25 hover:bg-white hover:text-ink'
      }`}
    >
      {status === 'copied' ? (
        <>
          <Check className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('ui.copied')}</span>
        </>
      ) : status === 'error' ? (
        <>
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('ui.copyFailed')}</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('builder.copy')}</span>
        </>
      )}
    </button>
  );
}

export function LanguageLensToggle({
  value,
  onChange,
}: {
  value: LangLens;
  onChange: (next: LangLens) => void;
}) {
  const { t } = useLang();
  const options: Array<{ id: LangLens; label: string }> = [
    { id: 'both', label: t('ui.langLens.both') },
    { id: 'en', label: t('ui.langLens.en') },
    { id: 'l1', label: t('ui.langLens.l1') },
  ];

  return (
    <div
      role="group"
      aria-label="Script language filter"
      className="inline-flex rounded-full border-2 border-ink/12 bg-parchment-dark/60 p-0.5 print:hidden"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={`min-h-[36px] rounded-full px-3 py-1 font-display text-xs font-semibold transition ${
              active
                ? 'bg-white text-terracotta shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: {
  tabs: Array<{ id: T; label: string; badge?: string }>;
  active: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl border-2 border-ink/10 bg-parchment-dark/65 p-1 print:hidden"
    >
      {tabs.map((tab) => {
        const isSelected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(tab.id)}
            className={`flex min-h-[44px] flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 font-display text-sm font-semibold transition ${
              isSelected
                ? 'bg-white text-terracotta shadow-[0_2px_0_rgba(39,34,32,0.08)]'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  isSelected ? 'bg-terracotta-bg text-terracotta' : 'bg-ink/8 text-ink-muted'
                }`}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function CollapsibleFormShell({
  collapsed,
  onToggle,
  summary,
  actions,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  summary: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLang();

  if (collapsed) {
    return (
      <div className="card-warm flex flex-wrap items-center justify-between gap-2 px-4 py-3 print:hidden">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{summary}</p>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-terracotta/30 bg-terracotta-bg px-3 py-1.5 font-display text-xs font-semibold text-terracotta transition hover:bg-terracotta/15 touch-target"
          >
            {t('ui.editInputs')}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="print:hidden">
      {actions ? (
        <div className="mb-2 flex items-center justify-end gap-2">
          {actions}
          {summary ? (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1 rounded-xl border-2 border-ink/12 bg-white px-3 py-1.5 font-display text-xs font-semibold text-ink-muted hover:text-ink touch-target"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              {t('primer.close')}
            </button>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
