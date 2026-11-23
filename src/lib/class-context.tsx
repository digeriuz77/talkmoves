// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { createContext, useContext, useState, type ReactNode } from 'react';
import { GraduationCap, SlidersHorizontal, Check } from 'lucide-react';
import { useLang } from './i18n';
import { usePersistentState } from './usePersistentState';
import { SelectField, languages, subjectLabel, subjects, yearLevels } from '../components/coach-ui';

export type ClassContextState = {
  yearLevel: string;
  subject: string;
  dominantLanguage: string;
};

type ClassContextValue = ClassContextState & {
  setYearLevel: (yearLevel: string) => void;
  setSubject: (subject: string) => void;
  setDominantLanguage: (dominantLanguage: string) => void;
  resetClassContext: () => void;
};

const DEFAULT_CLASS_CONTEXT: ClassContextState = {
  yearLevel: '4',
  subject: 'science',
  dominantLanguage: 'iban',
};

function readLegacyContext(): ClassContextState {
  try {
    const read = (key: string, fallback: string) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' && parsed.trim() ? parsed : fallback;
    };
    return {
      yearLevel: read('tmb.live.yearLevel', DEFAULT_CLASS_CONTEXT.yearLevel),
      subject: read('tmb.live.subject', DEFAULT_CLASS_CONTEXT.subject),
      dominantLanguage: read('tmb.live.dominantLanguage', DEFAULT_CLASS_CONTEXT.dominantLanguage),
    };
  } catch {
    return DEFAULT_CLASS_CONTEXT;
  }
}

const ClassContext = createContext<ClassContextValue | null>(null);

export function ClassContextProvider({ children }: { children: ReactNode }) {
  const [state, setState, resetClassContext] = usePersistentState<ClassContextState>(
    'tmb.classContext.v1',
    readLegacyContext(),
  );

  const value: ClassContextValue = {
    ...state,
    setYearLevel: (yearLevel) => setState((prev) => ({ ...prev, yearLevel })),
    setSubject: (subject) => setState((prev) => ({ ...prev, subject })),
    setDominantLanguage: (dominantLanguage) => setState((prev) => ({ ...prev, dominantLanguage })),
    resetClassContext,
  };

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>;
}

export function useClassContext(): ClassContextValue {
  const ctx = useContext(ClassContext);
  if (!ctx) throw new Error('useClassContext must be used within ClassContextProvider');
  return ctx;
}

function formatLanguageLabel(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ClassContextBar() {
  const { t } = useLang();
  const { yearLevel, subject, dominantLanguage, setYearLevel, setSubject, setDominantLanguage } =
    useClassContext();
  const [editing, setEditing] = useState(false);

  return (
    <section
      aria-label={t('classContext.aria')}
      className="mb-3 rounded-2xl border-2 border-ink/10 bg-parchment-light/95 px-3 py-2 shadow-[0_2px_0_rgba(39,34,32,0.06)] print:hidden"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-bg text-amber border border-amber/30">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs sm:text-sm font-bold text-ink">
            <span className="rounded-full bg-parchment-dark px-2.5 py-0.5 font-display text-xs text-ink">
              Year {yearLevel}
            </span>
            <span className="rounded-full bg-sky-bg px-2.5 py-0.5 font-display text-xs text-[#1c5f8d]">
              {subjectLabel(subject)}
            </span>
            <span className="rounded-full bg-sage-bg px-2.5 py-0.5 font-display text-xs text-[#1f6b4a]">
              {formatLanguageLabel(dominantLanguage)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing((open) => !open)}
          aria-expanded={editing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-ink/12 bg-white px-3 py-1.5 font-display text-xs font-semibold text-ink transition hover:border-terracotta/40 touch-target"
        >
          {editing ? <Check className="h-3.5 w-3.5 text-sage" /> : <SlidersHorizontal className="h-3.5 w-3.5 text-terracotta" />}
          {editing ? t('classContext.done') : t('classContext.edit')}
        </button>
      </div>

      {editing ? (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-ink/10 pt-3 sm:grid-cols-3">
          <SelectField
            label={t('live.yearLabel')}
            value={yearLevel}
            onChange={setYearLevel}
            options={yearLevels.map((y) => ({ value: y, label: `Year ${y}` }))}
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
    </section>
  );
}
