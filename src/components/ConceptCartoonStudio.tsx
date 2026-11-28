/** Ready-made KPM cartoons, shared with the vocabulary hub. No generation or API calls. */
import { useState } from 'react';
import { Printer } from 'lucide-react';
import { curriculumUnits } from '../data/curriculum';
import { useLang } from '../lib/i18n';
import { usePersistentState } from '../lib/usePersistentState';
import { LanguageLensToggle, type LangLens } from './coach-ui';
import { ConceptCartoonCard } from './ConceptCartoonView';

export default function ConceptCartoonStudio() {
  const { t, lang } = useLang();
  // Share the unit choice with the vocabulary hub, not a generated cartoon or teacher text.
  const [selectedUnitId, setSelectedUnitId] = usePersistentState(
    'tmb.primer.unitId',
    curriculumUnits[0]?.id ?? '',
  );
  const [selectedCartoonId, setSelectedCartoonId] = useState('');
  const [langLens, setLangLens] = useState<LangLens>('both');
  const unit = curriculumUnits.find((item) => item.id === selectedUnitId) ?? curriculumUnits[0];
  const cartoon = unit?.conceptCartoons.find((item) => item.id === selectedCartoonId)
    ?? unit?.conceptCartoons[0];

  return (
    <div className="space-y-4">
      <header className="print:hidden">
        <h1 className="heading-editorial">{t('studio.title')}</h1>
        <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-ink-muted">
          {t('studio.tagline')}
        </p>
      </header>

      <section className="card-warm space-y-4 p-4 sm:p-5 print:hidden">
        <p className="text-sm leading-snug text-ink-soft">{t('studio.intro')}</p>
        <label className="block">
          <span className="mb-1.5 block font-display text-sm font-bold text-ink">
            {t('studio.unitLabel')}
          </span>
          <select
            value={unit?.id ?? ''}
            onChange={(event) => {
              setSelectedUnitId(event.target.value);
              setSelectedCartoonId('');
            }}
            className="min-h-[44px] w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-base font-bold text-ink"
          >
            {curriculumUnits.map((item) => (
              <option key={item.id} value={item.id}>
                {lang === 'ms' ? 'Tahun' : 'Year'} {item.yearLevel} · {item.kpmCode}: {lang === 'ms' ? item.titleMs : item.title} ({item.pages})
              </option>
            ))}
          </select>
        </label>

        {unit && unit.conceptCartoons.length > 0 ? (
          <label className="block">
            <span className="mb-1.5 block font-display text-sm font-bold text-ink">
              {t('studio.cartoonLabel')}
            </span>
            <select
              value={cartoon?.id ?? ''}
              onChange={(event) => setSelectedCartoonId(event.target.value)}
              className="min-h-[44px] w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-base font-bold text-ink"
            >
              {unit.conceptCartoons.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.textbookPage})
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      {cartoon ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <LanguageLensToggle value={langLens} onChange={setLangLens} />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 font-display text-xs font-semibold text-ink touch-target"
            >
              <Printer className="h-4 w-4" aria-hidden />
              {t('studio.print')}
            </button>
          </div>
          <ConceptCartoonCard key={cartoon.id} cartoon={cartoon} langLens={langLens} />
        </>
      ) : (
        <p role="status" className="card-warm p-5 text-sm text-ink-soft">
          {t('studio.noCartoons')}
        </p>
      )}
    </div>
  );
}
