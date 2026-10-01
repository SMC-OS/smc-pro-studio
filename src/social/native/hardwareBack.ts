/**
 * Android hardware back, in order:
 *  1. An open modal (any `[aria-modal="true"]`): send it Escape. Every SMC
 *     dialog/drawer already closes on Escape through its own focus-trap
 *     contract, so back obeys the same rules. ReportDialog, for example, does
 *     not close while submitting, and back then does nothing rather than
 *     navigating away mid-submit.
 *  2. Otherwise, if there is an in-app step to return to: go back.
 *  3. At the root: minimise (the app keeps its state), never terminate.
 *
 * iOS has no hardware back button; nothing is registered there.
 */
export type BackOutcome = "dialog" | "history" | "minimise";

export type BackDeps = {
  doc: Document;
  historyBack: () => void;
  minimise: () => void;
};

export function handleHardwareBack(canGoBack: boolean, deps: BackDeps): BackOutcome {
  const dialogs = deps.doc.querySelectorAll('[aria-modal="true"]');
  const top = dialogs[dialogs.length - 1];
  if (top) {
    top.dispatchEvent(new (deps.doc.defaultView?.KeyboardEvent ?? KeyboardEvent)("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    return "dialog";
  }
  if (canGoBack) {
    deps.historyBack();
    return "history";
  }
  deps.minimise();
  return "minimise";
}
