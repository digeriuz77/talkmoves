// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { FileSearch, MessageSquareText } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { ClassContextBar } from '../lib/class-context';
import StrategyBar from './StrategyBar';
import QuestionPlanner from './QuestionPlanner';
import LessonCoach from './LessonCoach';

type PlanSubMode = 'plan' | 'lesson';

type TalkMoveBuilderProps = {
  subMode: PlanSubMode;
  onSubModeChange: (next: PlanSubMode) => void;
};

export default function TalkMoveBuilder({ subMode, onSubModeChange }: TalkMoveBuilderProps) {
  const { t } = useLang();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="heading-editorial">
          {subMode === 'plan' ? t('coach.tab.plan') : t('coach.tab.lesson')}
        </h1>
        <div
          role="tablist"
          aria-label={t('coach.tabsAria')}
          className="inline-flex rounded-2xl border-2 border-ink/12 bg-parchment-dark/65 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subMode === 'plan'}
            onClick={() => onSubModeChange('plan')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-display text-xs font-semibold transition sm:text-sm ${
              subMode === 'plan'
                ? 'bg-white text-terracotta shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <MessageSquareText className="h-4 w-4" aria-hidden />
            {t('plan.modeQuestion')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subMode === 'lesson'}
            onClick={() => onSubModeChange('lesson')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-display text-xs font-semibold transition sm:text-sm ${
              subMode === 'lesson'
                ? 'bg-white text-terracotta shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <FileSearch className="h-4 w-4" aria-hidden />
            {t('plan.modeLesson')}
          </button>
        </div>
      </div>

      <StrategyBar />

      <ClassContextBar />

      {subMode === 'plan' ? <QuestionPlanner /> : <LessonCoach />}
    </div>
  );
}
