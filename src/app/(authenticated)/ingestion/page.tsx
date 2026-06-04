"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Link2, Plus, CheckCircle2, AlertCircle, Monitor, Loader2, Store } from "lucide-react";
import Nango from "@nangohq/frontend";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { detectRetailer } from "./lib/per-site-detection";
import { RecentIngestions } from "./components/RecentIngestions";
import { TraceModal } from "./components/TraceModal";

type Toast = { type: "success" | "error"; message: string } | null;

interface Connection {
  marketplace: string;
  status: string;
  connectedAt?: string;
}

const MARKETPLACES = [
  { id: "shopify",  label: "Shopify",  live: true },
  { id: "amazon",   label: "Amazon",   live: false },
  { id: "ebay",     label: "eBay",     live: false },
  { id: "walmart",  label: "Walmart",  live: false },
  { id: "etsy",     label: "Etsy",     live: false },
] as const;

export default function IngestionPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState("");
  const [categoryHint, setCategoryHint] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [conns, setConns] = useState<Connection[]>([]);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [traceArtifactId, setTraceArtifactId] = useState<string | null>(null);

  useEffect(() => { void loadConns(); }, []);

  async function loadConns() {
    try { setConns(await api.listConnections()); } catch { /* silent */ }
  }

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }

  const handleFile = useCallback(async (file: File) => {
    const allowed = [
      "text/csv",
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/x-iwork-numbers-sffnumbers",
      "application/octet-stream",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAllowedExt = ["csv", "pdf", "xlsx", "numbers"].includes(ext ?? "");
    if (!allowed.includes(file.type) && !isAllowedExt) {
      showToast({ type: "error", message: "Only CSV, PDF, Excel (.xlsx), or Numbers (.numbers) files are accepted." });
      return;
    }
    setBusy("file");
    try {
      const { rowCount } = await api.uploadCsv(file);
      showToast({ type: "success", message: `File accepted — ${rowCount} row${rowCount === 1 ? "" : "s"} queued for ingestion.` });
      setRefreshSignal((s) => s + 1);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  async function handleUrl() {
    if (!url.trim()) return;
    setBusy("url");
    try {
      await api.importLink(url.trim(), categoryHint.trim() || undefined);
      showToast({ type: "success", message: "URL accepted — canonical extraction has started." });
      setUrl("");
      setCategoryHint("");
      setRefreshSignal((s) => s + 1);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const detected = detectRetailer(url);

  async function connect(marketplace: "shopify") {
    setBusy(marketplace);
    try {
      const { token } = await api.startConnect(marketplace);
      const nango = new Nango({ connectSessionToken: token });
      await nango.openConnectUI({ onEvent: (e) => { if (e.type === "close") void loadConns(); } });
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="animate-in w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold text-foreground">Ingestion Terminal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bring product data into Aonex — from a file, a marketplace link, or a connected store.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={[
          "mb-6 flex items-center gap-3 px-4 py-3 rounded-lg text-sm",
          toast.type === "success"
            ? "bg-success/10 border border-success/20 text-success"
            : "bg-danger/10 border border-danger/20 text-danger",
        ].join(" ")}>
          {toast.type === "success"
            ? <CheckCircle2 size={15} className="shrink-0" />
            : <AlertCircle size={15} className="shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-5 gap-4">
        {/* Drop zone — 3 cols */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={[
            "col-span-3 flex flex-col items-center justify-center gap-5 rounded-xl border transition-all duration-200 cursor-pointer min-h-[340px]",
            dragging
              ? "border-primary/40 bg-primary/5"
              : "border-border/[0.08] bg-card hover:border-border/[0.14] hover:bg-surface-hover",
          ].join(" ")}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.pdf,.xlsx,.numbers"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
          />
          <div className={[
            "size-16 rounded-2xl flex items-center justify-center transition-all duration-200",
            dragging ? "bg-primary/15 text-primary ring-4 ring-primary/10" : "bg-surface text-muted-foreground",
          ].join(" ")}>
            {busy === "file"
              ? <Loader2 size={28} className="animate-spin" />
              : <Upload size={28} strokeWidth={1.5} />}
          </div>
          <div className="text-center">
            <p className="font-serif text-xl font-semibold text-foreground/90">
              {busy === "file" ? "Processing…" : dragging ? "Drop to ingest" : "Upload a product file"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Drag &amp; drop, or click to browse
            </p>
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {["PDF", "CSV", "Excel", "Numbers"].map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-border/[0.08] bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
                >
                  {t}
                </span>
              ))}
            </div>
            <a
              href="/aonex-catalog-template.csv"
              download
              onClick={(e) => e.stopPropagation()}
              className="mt-5 inline-block text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Download CSV template
            </a>
          </div>
        </div>

        {/* Right column — 2 cols */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* External link */}
          <div className="rounded-xl border border-border/[0.08] bg-card p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={14} className="text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                External Link
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {detected && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                    {detected.name} parser
                  </span>
                  {detected.browserRequired && (
                    <span className="text-[10px] text-warning/80 flex items-center gap-1">
                      <Monitor size={10} />
                      Browser render
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/40">
                    Site-specific parser runs first
                  </span>
                </div>
              )}
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleUrl(); }}
                placeholder="https://amazon.com/dp/…"
                className="w-full bg-surface border border-border/[0.08] rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 transition-colors min-w-0"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleUrl(); }}
                  placeholder="Category hint e.g., 'Running Shoes' (Optional)"
                  className="flex-1 bg-surface border border-border/[0.08] rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 transition-colors min-w-0"
                />
                <button
                  onClick={() => void handleUrl()}
                  disabled={busy === "url" || !url.trim()}
                  className="px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground/50 leading-relaxed mb-4">
              Paste a marketplace listing URL to extract one product.
            </p>
          </div>

          {/* Connectors */}
          <div className="rounded-xl border border-border/[0.08] bg-card p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Store size={14} className="text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Connect a Store
              </p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Sync products automatically from your marketplace.</p>
            <div className="grid grid-cols-3 gap-2">
              {MARKETPLACES.map((mp) => (
                <button
                  key={mp.id}
                  onClick={() => mp.live ? void connect("shopify") : undefined}
                  disabled={busy !== null || !mp.live}
                  className={[
                    "relative rounded-lg px-2 py-2.5 text-xs font-semibold transition-all duration-150",
                    mp.live
                      ? "bg-surface border border-border/[0.08] text-foreground/80 hover:bg-surface-hover hover:border-border/[0.14] disabled:opacity-50"
                      : "bg-surface border border-border/[0.04] text-muted-foreground/30 cursor-default",
                  ].join(" ")}
                >
                  {mp.label}
                  {!mp.live && (
                    <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold uppercase tracking-wide bg-muted text-muted-foreground/60 px-1 py-0.5 rounded">
                      Soon
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active sources strip */}
      {conns.length > 0 && (
        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
            Active Sources
          </p>
          <div className="rounded-xl border border-border/[0.07] bg-card overflow-hidden">
            {conns.map((c, i) => (
              <div
                key={c.marketplace}
                className={[
                  "flex items-center justify-between px-5 py-3.5",
                  i > 0 ? "border-t border-border/[0.06]" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div className={[
                    "size-1.5 rounded-full",
                    c.status === "active" ? "bg-success" : "bg-warning",
                  ].join(" ")} />
                  <span className="text-sm font-medium capitalize text-foreground/90">
                    {c.marketplace}
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    {c.connectedAt
                      ? `since ${formatDate(c.connectedAt)}`
                      : c.status}
                  </span>
                </div>
                <button
                  onClick={() => void api.triggerSync(c.marketplace).then(loadConns)}
                  disabled={c.status !== "active" || busy !== null}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors uppercase tracking-wider"
                >
                  Sync now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent ingestions */}
      <div className="mt-6">
        <RecentIngestions
          refreshSignal={refreshSignal}
          onRowClick={(id) => setTraceArtifactId(id)}
        />
      </div>

      {/* Trace modal */}
      {traceArtifactId && (
        <TraceModal
          artifactId={traceArtifactId}
          onClose={() => setTraceArtifactId(null)}
        />
      )}
    </div>
  );
}
