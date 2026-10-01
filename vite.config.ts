import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

/**
 * Phase M2 environment model: development (dev server, local Supabase),
 * staging (`vite build --mode staging`, committed public .env.staging) and
 * production (`vite build`, production config supplied by CI). This plugin
 * stamps the build's environment into index.html as
 * `<meta name="smc-app-env">` so any bundle (including one extracted from an
 * APK) can be identified and verified by scripts/check-client-bundle.mjs.
 * It grants nothing and changes no behaviour or styling.
 */
function appEnvironmentMeta(mode: string, command: 'build' | 'serve'): Plugin {
  const declared = loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_ENV;
  const appEnv = declared === 'staging' ? 'staging' : command === 'serve' ? 'development' : 'production';
  return {
    name: 'smc-app-environment-meta',
    transformIndexHtml: (html) => html.replace('</head>', `  <meta name="smc-app-env" content="${appEnv}" />\n  </head>`),
  };
}

export default defineConfig(({mode, command}) => {
  return {
    plugins: [react(), tailwindcss(), appEnvironmentMeta(mode, command)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
