"use client";

import { LayoutGrid } from "lucide-react";

export default function CatalogPage() {
  return (
    <div className="animate-in max-w-8xl">
      <div className="mb-6">
        <h1 className="font-serif text-4xl font-bold text-foreground">Catalog</h1>
      </div>

      <div className="rounded-xl border border-border/[0.08] bg-card p-12 text-center">
        <div className="mx-auto size-14 rounded-2xl bg-white/[0.04] border border-border/[0.06] flex items-center justify-center">
          <LayoutGrid size={22} className="text-muted-foreground/60" strokeWidth={1.4} />
        </div>
      
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          The catalog table is paused while we land a new canonical payload. In the meantime,
          extracted SKU data is available on the Ingestion page under Recent Ingestions.
        </p>
      </div>
    </div>
  );
}
