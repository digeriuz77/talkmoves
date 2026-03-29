/**
 * Optional client-side observability: Sentry (errors) and Plausible (privacy-friendly analytics).
 * Configure with VITE_* env vars at build time; no-ops when unset.
 */

export function initObservability(): void {
  if (typeof window === 'undefined') return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn?.trim()) {
    void import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn: dsn.trim(),
        environment: import.meta.env.MODE,
      });
    });
  }

  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  if (!plausibleDomain?.trim()) return;
  if (document.querySelector('script[data-domain][src*="plausible.io"]')) return;

  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = plausibleDomain.trim();
  script.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(script);
}
