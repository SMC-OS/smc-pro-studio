import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell configuration (Phase M1).
 *
 * Production-safe by construction:
 * - The app always loads the bundled Vite build (`webDir: 'dist'`). There is
 *   deliberately no `server.url`: native builds never point at localhost or a
 *   remote dev server. For live-reload debugging, use `cap run --live-reload`
 *   locally and never commit the result.
 * - No cleartext traffic and no mixed content. Every backend call is HTTPS
 *   (supabaseClient.ts refuses non-HTTPS outside development).
 * - WebView debugging and native console logging are off, so release builds
 *   expose neither an inspectable WebView nor logged auth data.
 *
 * Colours follow the Warm Architectural Atelier system: the native surfaces
 * use #FBF9F5, which is visually continuous with the shell's ivory (#FBF8F2),
 * so the launch → app transition never flashes black or white.
 */
const NATIVE_SURFACE = '#FBF9F5';

const config: CapacitorConfig = {
  appId: 'com.smcprostudio.app',
  appName: 'SMC Pro Studio',
  webDir: 'dist',
  backgroundColor: NATIVE_SURFACE,
  loggingBehavior: 'none',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'never',
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    // Hidden by the app after its first render (src/social/native/nativeShell.ts)
    // so the WebView is painted before the launch surface fades away.
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 200,
      backgroundColor: NATIVE_SURFACE,
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    // Core Capacitor 8 plugin: dark status/navigation-bar content on the light
    // shell. Safe-area insets are passed to CSS (env() / --safe-area-inset-*).
    SystemBars: {
      style: 'LIGHT',
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
    // iOS: resize the WebView above the keyboard so fixed composers stay
    // visible, and tint the area behind the keyboard with the light surface.
    // (Android keyboard insets are handled by SystemBars; `resizeOnFullScreen`
    // is deliberately omitted because it conflicts with SystemBars.)
    Keyboard: {
      resize: 'native',
      autoBackdropColor: 'auto',
    },
  },
};

export default config;
