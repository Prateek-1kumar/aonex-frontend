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

// ── Content value rendering ───────────────────────────────────────────────────
// Synthesized content (SEO keywords, key features, FAQ, pros/cons, descriptions)
// is heterogeneous — strings, string lists, Q&A lists, pros/cons objects. Dumping
// JSON.stringify is unreadable, so render each shape natively. Detection is by the
// value's own shape, so it works regardless of the declared contentType.

function isQaList(v: unknown): v is { q?: string; a?: string; question?: string; answer?: string }[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => x != null && typeof x === "object" && !Array.isArray(x) && ("q" in x || "question" in x));
}
function isProsCons(v: unknown): v is { pros?: string[]; cons?: string[] } {
  return !!v && typeof v === "object" && !Array.isArray(v) && ("pros" in v || "cons" in v);
}
function isStringList(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string" || typeof x === "number");
}

/** Render a synthesized content value (string / list / Q&A / pros-cons) natively. */
export function ContentValue({ value }: { value: unknown }) {
  if (value == null || value === "") return <span className="text-muted-foreground/40">—</span>;

  if (isQaList(value)) {
    return (
      <ul className="space-y-1.5">
        {value.map((qa, i) => (
          <li key={i} className="text-xs">
            <span className="font-semibold text-foreground/85">Q: {qa.q ?? qa.question}</span>
            <br />
            <span className="text-foreground/65">A: {qa.a ?? qa.answer}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (isProsCons(value)) {
    const pros = Array.isArray(value.pros) ? value.pros : [];
    const cons = Array.isArray(value.cons) ? value.cons : [];
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-success/70">Pros</p>
          <ul className="space-y-0.5">{pros.map((p, i) => <li key={i} className="text-xs text-foreground/80">+ {p}</li>)}</ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-warning/70">Cons</p>
          <ul className="space-y-0.5">{cons.map((c, i) => <li key={i} className="text-xs text-foreground/80">− {c}</li>)}</ul>
        </div>
      </div>
    );
  }

  if (isStringList(value)) {
    if (value.length === 0) return <span className="text-muted-foreground/40">—</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((s, i) => (
          <span key={i} className="inline-flex rounded-md border border-border/[0.12] bg-surface px-2 py-0.5 text-[11px] text-foreground/80">
            {String(s)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === "string") {
    return <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap">{value}</p>;
  }
  return <p className="text-sm text-foreground/90 break-words">{JSON.stringify(value)}</p>;
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
