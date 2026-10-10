import { useState } from "react";
import { getMaterialImageUrl } from "../services/materialsClient";

/**
 * Phase 5 Slice C: the one editorial image of a material, or nothing at all.
 * No placeholder or stock imagery is ever substituted — a material without an
 * image (or whose image fails to load) simply renders no image element, so the
 * catalogue never implies a photo of a stone that doesn't exist.
 */
export function MaterialImage({
  imagePath,
  name,
  variant,
}: {
  imagePath: string | null;
  name: string;
  variant: "hero" | "thumb";
}) {
  const [failed, setFailed] = useState(false);
  const url = getMaterialImageUrl(imagePath);
  if (!url || failed) return null;

  const frame =
    variant === "hero"
      ? "aspect-[4/3] w-full overflow-hidden rounded-[var(--smc-radius-card)]"
      : "h-16 w-16 shrink-0 overflow-hidden rounded-[var(--smc-radius-card)]";

  return (
    <div className={`${frame} bg-[var(--smc-limestone)]`}>
      <img
        src={url}
        alt={variant === "hero" ? `${name} surface` : ""}
        loading={variant === "hero" ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
