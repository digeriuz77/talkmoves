/// <reference types="vite/client" />

// React 19 ships without bundled JSX types and @types/react is not in package.json.
// Declare standard JSX key attributes so tsc --noEmit validates mapped components cleanly.
declare global {
  interface ImportMetaEnv {
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_PLAUSIBLE_DOMAIN?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  namespace JSX {
    interface IntrinsicAttributes {
      key?: string | number | bigint | null;
    }
  }
}

export {};
