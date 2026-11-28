// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { useState, type ReactNode } from 'react';
import {
  Dices,
  Gamepad2,
  Info,
  LayoutGrid,
  Mail,
  MessageSquareText,
  X,
  Zap,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import type { AppRoute } from '../lib/router';
import TalkMovesLogo from './TalkMovesLogo';

const CONTACT_EMAIL = 'gstanyard@gmail.com';

type PrimaryTab = 'home' | 'live' | 'primer' | 'plan' | 'play';

function getActiveTab(route: AppRoute): PrimaryTab {
  if (route.name === 'live') return 'live';
  // The Cartoon Studio belongs to the "Vocab & Cartoons" family.
  if (route.name === 'primer' || route.name === 'cartoon') return 'primer';
  if (route.name === 'plan' || route.name === 'lesson') return 'plan';
  if (route.name === 'play' || route.name === 'game') return 'play';
  return 'home';
}

export default function AppShell({
  route,
  onNavigate,
  children,
}: {
  route: AppRoute;
  onNavigate: (next: AppRoute) => void;
  children: ReactNode;
}) {
  const { t, lang, setLang } = useLang();
  const [showInfo, setShowInfo] = useState(false);
  const activeTab = getActiveTab(route);

  const navItems: Array<{
    id: PrimaryTab;
    label: string;
    icon: typeof LayoutGrid;
    target: AppRoute;
    activeClass: string;
  }> = [
    {
      id: 'home',
      label: t('nav.home'),
      icon: LayoutGrid,
      target: { name: 'home' },
      activeClass: 'bg-parchment-dark text-ink border-ink/25',
    },
    {
      id: 'live',
      label: t('nav.live'),
      icon: Zap,
      target: { name: 'live' },
      activeClass: 'bg-amber-bg text-[#9e5f06] border-amber/45',
    },
    {
      id: 'primer',
      label: t('nav.primer'),
      icon: Dices,
      target: { name: 'primer' },
      activeClass: 'bg-sage-bg text-[#1f6b4a] border-sage/40',
    },
    {
      id: 'plan',
      label: t('nav.plan'),
      icon: MessageSquareText,
      target: { name: 'plan' },
      activeClass: 'bg-sky-bg text-[#1c5f8d] border-sky/40',
    },
    {
      id: 'play',
      label: t('nav.play'),
      icon: Gamepad2,
      target: { name: 'play' },
      activeClass: 'bg-terracotta-bg text-terracotta border-terracotta/40',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-parchment font-body text-ink">
      {/* Sticky Top App Bar */}
      <header className="sticky top-0 z-40 border-b-2 border-ink/10 bg-parchment-light/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-2.5">
          <button
            type="button"
            onClick={() => onNavigate({ name: 'welcome' })}
            title={t('landing.title')}
            className="flex min-w-0 items-center gap-2 rounded-xl pr-2 text-left transition hover:opacity-85 touch-target"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-2 border-[#b84422] bg-terracotta text-white shadow-[0_2px_0_#a33a1b]">
              <TalkMovesLogo className="h-5 w-5" />
            </span>
            <span className="truncate font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
              {t('landing.title')}
            </span>
          </button>

          {/* Desktop Navigation Pills */}
          <nav
            aria-label={t('nav.primaryAria')}
            className="hidden items-center gap-1 sm:flex"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.target)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-2 font-display text-sm font-semibold transition touch-target ${
                    active
                      ? `${item.activeClass} shadow-[0_2px_0_rgba(39,34,32,0.08)]`
                      : 'border-transparent text-ink-soft hover:bg-parchment-dark/60 hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right controls: compact EN|BM toggle + Info button */}
          <div className="flex shrink-0 items-center gap-1.5">
            <div
              role="group"
              aria-label={t('lang.aria')}
              className="inline-flex overflow-hidden rounded-full border-2 border-ink/15 bg-parchment-dark/60 p-0.5"
            >
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={`min-h-[36px] min-w-[38px] rounded-full px-2.5 font-display text-xs font-bold transition ${
                  lang === 'en' ? 'bg-terracotta text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('ms')}
                aria-pressed={lang === 'ms'}
                className={`min-h-[36px] min-w-[38px] rounded-full px-2.5 font-display text-xs font-bold transition ${
                  lang === 'ms' ? 'bg-terracotta text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
              >
                BM
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              aria-label={t('nav.info')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/12 bg-white text-ink-muted transition hover:border-ink/25 hover:text-ink"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Top-aligned scrollable workspace */}
      <main className="mx-auto w-full max-w-5xl px-3 pt-4 pb-24 sm:px-6 sm:pt-6 sm:pb-10">
        {children}
      </main>

      {/* Fixed Mobile Bottom Navigation (thumb zone) */}
      <nav
        aria-label={t('nav.primaryAria')}
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink/10 bg-parchment-light/95 px-1.5 pt-1.5 backdrop-blur-md pb-safe sm:hidden print:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.target)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 py-1 transition ${
                  active
                    ? `${item.activeClass} shadow-[0_2px_0_rgba(39,34,32,0.08)]`
                    : 'border-transparent text-ink-muted'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="font-display text-[10px] font-semibold leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Lightweight Info Sheet */}
      {showInfo ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-3 backdrop-blur-[2px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-info-title"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="card-warm w-full max-w-md p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="app-info-title" className="card-title">
                {t('mode.aboutTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                aria-label={t('primer.close')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/12 bg-white text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">{t('mode.aboutBody')}</p>
            <div className="mt-4 border-t border-ink/10 pt-3">
              <p className="text-xs font-bold text-ink-muted">{t('landing.contact')}</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-terracotta-bg px-3 py-2 font-display text-sm font-semibold text-terracotta touch-target"
              >
                <Mail className="h-4 w-4" />
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
