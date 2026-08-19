import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import SocialApp from './social/SocialApp.tsx';
import {SOCIAL_SHELL_ENABLED} from './social/flags.ts';
import './index.css';

// SOCIAL_SHELL_ENABLED defaults to false, so this keeps rendering the
// existing production App unless an environment explicitly opts in via
// VITE_SOCIAL_SHELL_ENABLED=true. See src/social/flags.ts.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {SOCIAL_SHELL_ENABLED ? <SocialApp /> : <App />}
  </StrictMode>,
);
