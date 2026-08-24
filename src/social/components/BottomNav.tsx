import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Home, MessageCircle, Plus, User, Users } from "lucide-react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type Transition,
} from "motion/react";
import { Link, matchPath, useLocation } from "react-router-dom";

/**
 * App-wide bottom navigation interaction spec (per owner brief, v2):
 * - The active tab is a floating circular bead that sits partly above the
 *   bar, with the bar's own top edge morphing into a concave notch that
 *   cradles it — a single continuous SVG shape, not a sliding highlight.
 * - The bead carries the active icon; the active label floats just beneath
 *   it, inside the notch. Inactive tabs stay plain outline icon + label.
 * - Switching tabs animates the notch/bead position with one fluid,
 *   premium (not bouncy) spring. prefers-reduced-motion collapses that to
 *   an instant snap.
 * - Create's bead is a touch larger/deeper-toned when active — the only
 *   concession to "slightly more prominent" — everything else about it is
 *   the same shape language as the other four tabs.
 * - The underlying <Link> for the active tab keeps its full 44px target,
 *   aria-current="page", and focus ring in its normal flex slot; only its
 *   *visible* icon/label are suppressed in favour of the floating bead, so
 *   assistive tech and keyboard users lose nothing.
 */

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true, emphasized: false },
  { to: "/network", label: "Network", icon: Users, end: false, emphasized: false },
  { to: "/create", label: "Create", icon: Plus, end: false, emphasized: true },
  { to: "/messages", label: "Messages", icon: MessageCircle, end: false, emphasized: false },
  { to: "/profile", label: "Profile", icon: User, end: false, emphasized: false },
] as const;

const SPRING: Transition = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 };
const SNAP: Transition = { duration: 0 };

const BAR_HEIGHT = 66;
const NOTCH_HALF_SPAN = 50;
const NOTCH_DEPTH = 26;
const BEAD_DIAMETER = 54;
const BEAD_DIAMETER_EMPHASIZED = 60;
const BEAD_FLOAT_RATIO = 0.52;
const WRAPPER_WIDTH = 92;

function buildBarPath(width: number, cx: number | null): string {
  const w = Math.max(width, 1);
  if (cx === null) {
    // No primary tab owns the current route - a flat, un-notched bar is the
    // safe default rather than cradling a bead that isn't shown.
    return `M0,0 L${w},0 L${w},${BAR_HEIGHT} L0,${BAR_HEIGHT} Z`;
  }
  const left = Math.max(0, cx - NOTCH_HALF_SPAN);
  const right = Math.min(w, cx + NOTCH_HALF_SPAN);
  return [
    `M0,0`,
    `L${left},0`,
    `C${left + NOTCH_HALF_SPAN * 0.42},0 ${cx - NOTCH_HALF_SPAN * 0.58},${NOTCH_DEPTH} ${cx},${NOTCH_DEPTH}`,
    `C${cx + NOTCH_HALF_SPAN * 0.58},${NOTCH_DEPTH} ${right - NOTCH_HALF_SPAN * 0.42},0 ${right},0`,
    `L${w},0`,
    `L${w},${BAR_HEIGHT}`,
    `L0,${BAR_HEIGHT}`,
    `Z`,
  ].join(" ");
}

/**
 * Which primary tab (if any) owns the current route. A plain
 * `NAV_ITEMS.findIndex(...)` returns -1 when nothing matches, and the
 * previous `Math.max(0, ...)` coerced that "nothing" into "Home" - falsely
 * showing Home as active on /auth, /auth/reset-password, dev preview
 * routes, and any other non-primary route. `/connections` is the one
 * deliberate exception: it's reached only from ProfileRoute's "Connections"
 * link and isn't a primary tab of its own (see SocialApp.tsx's route
 * comment), so it should still highlight Profile. Everything else that
 * doesn't match a primary tab returns null - no tab is active.
 */
function findActiveIndex(pathname: string): number | null {
  const matched = NAV_ITEMS.findIndex((item) => matchPath({ path: item.to, end: item.end }, pathname));
  if (matched !== -1) return matched;
  if (matchPath({ path: "/connections", end: false }, pathname)) {
    const profileIndex = NAV_ITEMS.findIndex((item) => item.to === "/profile");
    return profileIndex === -1 ? null : profileIndex;
  }
  return null;
}

export default function BottomNav() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const pathRef = useRef<SVGPathElement | null>(null);
  const hasMountedRef = useRef(false);

  const [containerWidth, setContainerWidth] = useState(0);
  const [tabCenters, setTabCenters] = useState<number[]>([]);

  const activeIndex = findActiveIndex(location.pathname);
  const activeItem = activeIndex !== null ? NAV_ITEMS[activeIndex] : null;
  const beadDiameter = activeItem?.emphasized ? BEAD_DIAMETER_EMPHASIZED : BEAD_DIAMETER;
  const beadFloat = beadDiameter * BEAD_FLOAT_RATIO;

  const fallbackTarget =
    containerWidth && activeIndex !== null ? ((activeIndex + 0.5) / NAV_ITEMS.length) * containerWidth : 0;
  const targetX = activeIndex !== null ? tabCenters[activeIndex] ?? fallbackTarget : null;

  const beadX = useMotionValue(targetX ?? 0);
  const beadOffsetX = useTransform(beadX, (v) => v - WRAPPER_WIDTH / 2);

  // Measure real tab centres so the notch/bead line up exactly at any width.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const rect = container.getBoundingClientRect();
      setContainerWidth(rect.width);
      setTabCenters(
        itemRefs.current.map((el) => {
          if (!el) return rect.width / 2;
          const itemRect = el.getBoundingClientRect();
          return itemRect.left - rect.left + itemRect.width / 2;
        }),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("orientationchange", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  // Keep the SVG notch path attribute in sync with the bead position without
  // forcing a React re-render on every animation frame.
  useMotionValueEvent(beadX, "change", (latest) => {
    pathRef.current?.setAttribute("d", buildBarPath(containerWidth, activeIndex !== null ? latest : null));
  });

  // Snap into place on first real measurement; animate on every tab switch
  // after that (or snap instantly under prefers-reduced-motion). When no
  // primary tab owns the route, draw a flat bar and leave the bead wherever
  // it last was - it's hidden (see the `activeItem &&` guard below) so its
  // position doesn't matter until a real target reappears.
  useEffect(() => {
    if (targetX === null) {
      pathRef.current?.setAttribute("d", buildBarPath(containerWidth, null));
      return;
    }
    if (tabCenters.length === 0) return;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      beadX.set(targetX);
      pathRef.current?.setAttribute("d", buildBarPath(containerWidth, targetX));
      return;
    }
    const controls = animate(beadX, targetX, prefersReducedMotion ? SNAP : SPRING);
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetX, tabCenters.length, prefersReducedMotion]);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 lg:hidden"
      style={{ paddingBottom: "var(--smc-safe-bottom)" }}
    >
      <div ref={containerRef} className="relative mx-auto max-w-2xl" style={{ height: BAR_HEIGHT }}>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${containerWidth || 1} ${BAR_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ filter: "drop-shadow(0 -1px 6px rgba(34, 31, 28, 0.06))" }}
        >
          <path
            ref={pathRef}
            d={buildBarPath(containerWidth, targetX)}
            style={{ fill: "var(--smc-surface-raised)", stroke: "var(--smc-border)", strokeWidth: 1 }}
          />
        </svg>

        {activeItem && (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <motion.div
              className="absolute top-0 flex flex-col items-center"
              style={{ width: WRAPPER_WIDTH, x: beadOffsetX }}
            >
              <span
                className={`flex items-center justify-center rounded-full ${
                  activeItem.emphasized
                    ? "shadow-[0_10px_20px_-8px_rgba(138,106,69,0.55)]"
                    : "shadow-[0_8px_16px_-8px_rgba(34,31,28,0.35)]"
                }`}
                style={{
                  width: beadDiameter,
                  height: beadDiameter,
                  transform: `translateY(-${beadFloat}px)`,
                  background: activeItem.emphasized
                    ? "linear-gradient(150deg, var(--smc-mineral-bronze), var(--smc-mineral-clay))"
                    : "linear-gradient(150deg, var(--smc-travertine), var(--smc-sand))",
                  border: `1px solid ${activeItem.emphasized ? "var(--smc-mineral-clay)" : "var(--smc-border-strong)"}`,
                }}
              >
                <activeItem.icon
                  className="h-6 w-6"
                  strokeWidth={2.2}
                  color={activeItem.emphasized ? "#fdfbf7" : "var(--smc-charcoal)"}
                />
              </span>
              <span
                className="text-[11px] font-semibold tracking-wide"
                style={{ marginTop: 4 - beadFloat, color: "var(--smc-charcoal)" }}
              >
                {activeItem.label}
              </span>
            </motion.div>
          </div>
        )}

        <ul className="relative flex h-full items-stretch justify-between px-2">
          {NAV_ITEMS.map((item, index) => {
            // Suppression (and `aria-current`) follows the bead's own owner
            // (`activeIndex`), not react-router's native per-link
            // `isActive` - the two only ever disagree for Profile while on
            // /connections (see findActiveIndex), where the bead claims
            // Profile but a plain NavLink's native isActive is false since
            // the pathname isn't literally under /profile. `NavLink` gives
            // no way to override its own computed `aria-current` (it always
            // wins over a caller-supplied value), so this renders a plain
            // `Link` and sets both the visible suppression and
            // `aria-current` from `isBeadActive` directly - keeping the
            // link's real accessible "current page" semantics in sync with
            // what's visually shown, including on /connections.
            const isBeadActive = activeIndex === index;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  to={item.to}
                  aria-current={isBeadActive ? "page" : undefined}
                  className="group relative flex min-h-[44px] w-full flex-col items-center justify-center gap-0.5 rounded-[var(--smc-radius-card)] py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--smc-mineral-bronze)] focus-visible:ring-offset-1"
                >
                  {!isBeadActive && (
                    <item.icon
                      className="h-5 w-5"
                      strokeWidth={1.6}
                      color="var(--smc-charcoal-faint)"
                      aria-hidden="true"
                    />
                  )}
                  {!isBeadActive && (
                    <span className="nav-label max-[359px]:hidden text-[11px] font-medium text-[var(--smc-charcoal-faint)]">
                      {item.label}
                    </span>
                  )}
                  <span className="sr-only">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
