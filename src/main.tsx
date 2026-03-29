import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LangProvider, getInitialLang, persistLang, setDocumentLang, type Lang } from './lib/i18n.tsx';
import { initObservability } from './lib/observability';
import './index.css';

initObservability();

function Root() {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    persistLang(lang);
    setDocumentLang(lang);
  }, [lang]);

  return (
    <LangProvider lang={lang} setLang={setLangState}>
      <App />
    </LangProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
