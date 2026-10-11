import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { completeAuthRedirect } from "../../services/authClient";
import {
  closeNativeBrowser,
  installNativeUrlListener,
  routeFromNativeUrl,
} from "../../services/nativeLinks";

function withoutAuthCredentials(route: string): string {
  const url = new URL(route, "https://smcprostudio.app");
  url.searchParams.delete("code");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  url.hash = "";
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function NativeUrlBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    let disposed = false;
    let removeListener: (() => Promise<void>) | null = null;

    void installNativeUrlListener(async (rawUrl) => {
      if (disposed) return;
      const route = routeFromNativeUrl(rawUrl);
      if (!route) return;

      const isAuthCallback = route.startsWith("/auth/callback");
      const isPasswordRecovery = route.startsWith("/auth/reset-password");
      if (isAuthCallback || isPasswordRecovery) {
        try {
          await completeAuthRedirect(rawUrl);
        } catch {
          await closeNativeBrowser();
          navigate("/auth?verification=failed", { replace: true });
          return;
        }
      }

      await closeNativeBrowser();
      if (!disposed) {
        if (isAuthCallback) navigate("/auth?verification=success", { replace: true });
        else navigate(withoutAuthCredentials(route), { replace: false });
      }
    })
      .then((remove) => {
        if (disposed) void remove();
        else removeListener = remove;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [navigate]);

  return null;
}
