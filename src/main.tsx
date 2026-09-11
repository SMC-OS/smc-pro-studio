import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import SocialApp from './social/SocialApp.tsx';
import {LEGACY_APP_OPT_IN} from './social/flags.ts';
import './index.css';

// Phase 5 Gate 0: the social shell is now the safe default. The legacy App
// (fabricated pricing/stock/certification/testimonial content — see
// tasks/todo.md's Gate 0 inventory) renders only via an explicit,
// development-only opt-in that production cannot be tricked into honouring
// — see src/social/flags.ts for the fail-closed mechanism.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {LEGACY_APP_OPT_IN ? <App /> : <SocialApp />}
  </StrictMode>,
);
