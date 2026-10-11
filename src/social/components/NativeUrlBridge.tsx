import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { completeAuthRedirect } from "../../services/authClient";
import {
  closeNativeBrowser,
  installNativeUrlListener,
  routeFromNativeUrl,
} from "../../services/nativeLinks";

function withoutAuthCode(route: string): string {
  const url = new URL(route, "https://smcprostudio.app");
  url.searchParams.delete("code");
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

      if (route.startsWith("/auth/callback")) {
        try {
          await completeAuthRedirect(rawUrl);
        } catch {
          navigate("/auth", { replace: true });
          return;
        }
      }

      await closeNativeBrowser();
      if (!disposed) navigate(withoutAuthCode(route), { replace: false });
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
