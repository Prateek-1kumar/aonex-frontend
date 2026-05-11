"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Link2, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import Nango from "@nangohq/frontend";
import { api } from "@/lib/api";

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
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [conns, setConns] = useState<Connection[]>([]);

  useEffect(() => { void loadConns(); }, []);

  async function loadConns() {
    try { setConns(await api.listConnections()); } catch { /* silent */ }
  }

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }

  const handleFile = useCallback(async (file: File) => {
    const allowed = ["text/csv", "application/pdf", "application/vnd.ms-excel"];
    if (!allowed.includes(file.type) && !file.name.endsWith(".csv")) {
      showToast({ type: "error", message: "Only CSV or PDF files are accepted." });
      return;
    }
    setBusy("file");
    try {
      await api.uploadCsv(file);
      showToast({ type: "success", message: "File accepted — processing your catalog." });
      void loadConns();
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
      await api.submitUrl(url.trim());
      showToast({ type: "success", message: "URL submitted — extracting product data." });
      setUrl("");
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

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
    <div className="animate-in max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold text-foreground">Ingestion Terminal</h1>
        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Data Orchestration & Neural Mapping
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={[
          "mb-6 flex items-center gap-3 px-4 py-3 rounded-lg text-sm",
          toast.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400",
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
              : "border-border/[0.08] bg-card hover:border-border/[0.14] hover:bg-white/[0.02]",
          ].join(" ")}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
          />
          <div className={[
            "size-16 rounded-2xl flex items-center justify-center transition-colors",
            dragging ? "bg-primary/15 text-primary/100" : "bg-white/[0.05] text-muted-foreground",
          ].join(" ")}>
            <Upload size={28} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="font-serif text-xl font-semibold text-foreground/90">
              {busy === "file" ? "Processing…" : "Ingest Manifest"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Drag &amp; drop{" "}
              <span className="text-primary/100">PDF</span>
              {" "}or{" "}
              <span className="text-primary/100">CSV</span>
              {" "}to begin neural orchestration
            </p>
            <p className="mt-3 text-xs text-muted-foreground/50 uppercase tracking-widest">
              — or click to browse —
            </p>
          </div>
        </div>

        {/* Right column — 2 cols */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* External link */}
          <div className="rounded-xl border border-border/[0.08] bg-card p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={14} className="text-primary/100" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                External Link
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleUrl(); }}
                placeholder="https://amazon.com/dp/…"
                className="flex-1 bg-white/[0.04] border border-border/[0.08] rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 transition-colors min-w-0"
              />
              <button
                onClick={() => void handleUrl()}
                disabled={busy === "url" || !url.trim()}
                className="size-9 rounded-lg bg-primary/10 text-primary/100 hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground/50 leading-relaxed">
              Paste a marketplace listing URL to extract one product.
            </p>
          </div>

          {/* Connectors */}
          <div className="rounded-xl border border-border/[0.08] bg-card p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={14} className="text-primary/100" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Quick Orchestration
              </p>
            </div>
            <p className="text-sm font-medium text-foreground/80 mb-4">Connect Marketplace</p>
            <div className="grid grid-cols-3 gap-2">
              {MARKETPLACES.map((mp) => (
                <button
                  key={mp.id}
                  onClick={() => mp.live ? void connect("shopify") : undefined}
                  disabled={busy !== null || !mp.live}
                  className={[
                    "relative rounded-lg px-2 py-2.5 text-xs font-semibold transition-all duration-150",
                    mp.live
                      ? "bg-white/[0.04] border border-border/[0.08] text-foreground/80 hover:bg-white/[0.07] hover:border-border/[0.14] disabled:opacity-50"
                      : "bg-white/[0.02] border border-border/[0.04] text-muted-foreground/30 cursor-default",
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
                    c.status === "active" ? "bg-emerald-400" : "bg-amber-400",
                  ].join(" ")} />
                  <span className="text-sm font-medium capitalize text-foreground/90">
                    {c.marketplace}
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    {c.connectedAt
                      ? `since ${new Date(c.connectedAt).toLocaleDateString()}`
                      : c.status}
                  </span>
                </div>
                <button
                  onClick={() => void api.triggerSync(c.marketplace).then(loadConns)}
                  disabled={c.status !== "active" || busy !== null}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary/100 disabled:opacity-30 transition-colors uppercase tracking-wider"
                >
                  Sync now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
