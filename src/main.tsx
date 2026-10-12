import {StrictMode, type ComponentType} from 'react';
import {createRoot} from 'react-dom/client';
import SocialApp from './social/SocialApp.tsx';
import {LEGACY_APP_OPT_IN} from './social/flags.ts';
import './index.css';

// Phase 5 Gate 0: the social shell is now the safe default. The legacy App
// (fabricated pricing/stock/certification/testimonial content — see
// tasks/todo.md's Gate 0 inventory) renders only via an explicit,
// development-only opt-in that production cannot be tricked into honouring
// — see src/social/flags.ts for the fail-closed mechanism.
//
// The legacy App is loaded with a dynamic import inside a branch guarded
// directly by import.meta.env.PROD. In a production build that condition is
// the constant `false`, so the branch, and with it the whole legacy module
// graph (jsPDF, html2canvas, DOMPurify, legacy screens), is removed at build
// time rather than shipped as dead code. Development opt-in still works.
const root = createRoot(document.getElementById('root')!);
const render = (Component: ComponentType) =>
  root.render(
    <StrictMode>
      <Component />
    </StrictMode>,
  );

if (!import.meta.env.PROD && LEGACY_APP_OPT_IN) {
  void import('./App.tsx').then(({default: App}) => render(App));
} else {
  render(SocialApp);
}
