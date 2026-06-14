import { Copy, RotateCcw } from 'lucide-react';
import { useLang } from '../lib/i18n';

export const subjects = ['science', 'maths', 'english', 'malay', 'social studies', 'design', 'it'];
export const yearLevels = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
export const languages = ['english', 'malay', 'iban'];

export function subjectLabel(value: string): string {
  if (value === 'it') return 'IT';
  return value
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export type NeedCategory = 'pacing' | 'control' | 'scaffolding' | 'mixed';

const NEED_STYLES: Record<NeedCategory, string> = {
  pacing: 'border-amber-200 bg-amber-50 text-amber-700',
  control: 'border-red-200 bg-red-50 text-red-700',
  scaffolding: 'border-sky-200 bg-sky-50 text-sky-700',
  mixed: 'border-violet-200 bg-violet-50 text-violet-700',
};

export async function copyText(value: string) {
  if (!value) return;
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
    <label>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
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
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style}`}
    >
      {t(`coach.need.${category}`)}
    </span>
  );
}

export function SayLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="mt-2 rounded-lg border border-ink/10 bg-white/60 px-3 py-2">
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm text-ink-soft">{value}</p>
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-ink/20 bg-white/70 px-3 py-2 text-xs font-semibold text-ink-muted transition hover:bg-white hover:text-ink touch-target"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      {t('coach.startNew')}
    </button>
  );
}

export function CopyButton({ value }: { value: string }) {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={() => copyText(value)}
      className="inline-flex items-center gap-1 rounded border border-ink/15 px-2 py-1 text-[11px] font-semibold text-ink-muted hover:bg-white"
    >
      <Copy className="h-3.5 w-3.5" />
      {t('builder.copy')}
    </button>
  );
}
