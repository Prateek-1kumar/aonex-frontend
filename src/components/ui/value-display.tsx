"use client";

/**
 * Shared helpers for rendering enrichment values that would otherwise dump walls
 * of raw text — most importantly image arrays, which we show as thumbnails
 * instead of pasted CDN URLs. Used by both the Enrich Review drawer and the
 * Review & Commit detail view so they stay visually consistent.
 */

/** Pull image URLs out of a value that's an array of url-strings or {url} objects. */
export function asImageUrls(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const urls: string[] = [];
  for (const x of v) {
    if (typeof x === "string" && /^https?:\/\//i.test(x)) urls.push(x);
    else if (x && typeof x === "object" && typeof (x as { url?: unknown }).url === "string") {
      urls.push((x as { url: string }).url);
    }
  }
  return urls.length ? urls : null;
}

export function ThumbStrip({ urls, size = "md" }: { urls: string[]; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "size-12" : "size-14";
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
      {urls.slice(0, 12).map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- remote merchant CDN URLs
        <img
          key={`${u}-${i}`}
          src={u}
          alt=""
          loading="lazy"
          className={`${dim} shrink-0 rounded-lg border border-border/[0.1] bg-surface object-cover`}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      ))}
      {urls.length > 12 && (
        <span className="self-center px-1 text-[11px] font-semibold tabular-nums text-muted-foreground/50">
          +{urls.length - 12}
        </span>
      )}
    </div>
  );
}
