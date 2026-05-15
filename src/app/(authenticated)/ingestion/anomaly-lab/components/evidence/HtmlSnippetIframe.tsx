"use client";

import { useEffect, useRef } from "react";

export function HtmlSnippetIframe({ html }: { html: string | null }) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!ref.current || !html) return;
    const doc = ref.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(
      `<!doctype html><meta charset="utf-8"><base target="_blank">` +
      `<style>html,body{margin:0;padding:8px;font:13px/1.4 system-ui;color:#bbb;background:#0c0c0c}</style>` +
      html
    );
    doc.close();
  }, [html]);

  if (!html) return <p className="text-xs text-muted-foreground">No HTML snippet available.</p>;
  return (
    <iframe
      ref={ref}
      sandbox="allow-same-origin"
      className="w-full h-48 rounded-md border border-border/[0.06] bg-black/40"
      title="Evidence HTML snippet"
    />
  );
}
