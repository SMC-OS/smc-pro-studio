import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { exchangeAuthCode } from "../../services/authRedirect";
import { handleAuthDeepLink } from "./authDeepLinks";
import { handleHardwareBack } from "./hardwareBack";

/**
 * Native-only wiring, mounted once inside the router (renders nothing; a
 * no-op on the web):
 * - auth deep links: cold start (getLaunchUrl) and warm (appUrlOpen), one
 *   central handler (authDeepLinks.ts);
 * - Android hardware back (hardwareBack.ts);
 * - hide the launch screen after the first paint, so the WebView is visible
 *   before the launch surface fades (no black/white flash).
 */
const handledUrls = new Set<string>();

export function NativeShell() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const open = (url: string | undefined) => {
      if (!url || handledUrls.has(url)) return;
      handledUrls.add(url);
      void handleAuthDeepLink(url, {
        exchangeCode: exchangeAuthCode,
        navigate: (to, options) => navigateRef.current(to, options),
      });
    };

    const handles: Promise<PluginListenerHandle>[] = [App.addListener("appUrlOpen", ({ url }) => open(url))];
    void App.getLaunchUrl()
      .then((launch) => open(launch?.url))
      .catch(() => undefined);

    if (Capacitor.getPlatform() === "android") {
      handles.push(
        App.addListener("backButton", ({ canGoBack }) => {
          handleHardwareBack(canGoBack, {
            doc: document,
            historyBack: () => window.history.back(),
            minimise: () => void App.minimizeApp(),
          });
        }),
      );
    }

    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => void SplashScreen.hide().catch(() => undefined)),
    );

    return () => {
      cancelAnimationFrame(frame);
      for (const handle of handles) void handle.then((h) => h.remove());
    };
  }, []);

  return null;
}
