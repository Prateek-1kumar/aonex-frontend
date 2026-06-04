const LOG_LINES = [
  { cls: "log-muted",  text: "[00:00:01] Ingestion job #4821 initialised" },
  { cls: "log-teal",   text: "[INFO] Source type detected: PDF spec sheet (Bosch SKUs batch)" },
  { cls: "log-teal",   text: "[INFO] Extracting 847 product attributes across 23 SKUs" },
  { cls: "log-green",  text: "[SUCCESS] 21 of 23 SKUs → READY — confidence ≥ 80%" },
  { cls: "log-amber",  text: "[WARN] 2 SKUs routed → Anomaly Lab (confidence < 40%)" },
  { cls: "log-teal",   text: "[INFO] Enrichment pipeline triggered for 21 ready SKUs" },
  { cls: "log-green",  text: "[SUCCESS] Linguistic Score: 94/100 · SEO Density: High" },
  { cls: "log-teal",   text: "[INFO] Competitor signal: PANASONIC-SKU-3341 OOS · Amazon DE" },
  { cls: "log-green",  text: "[SUCCESS] Opportunity card created — HIGH IMPACT" },
  { cls: "log-teal",   text: "[INFO] Syncing 21 SKUs → Amazon EU, Flipkart, Zalando" },
  { cls: "log-green",  text: "[SUCCESS] All channels confirmed 200 OK · 0.002ms latency" },
];

const COLOR_MAP: Record<string, string> = {
  "log-muted": "text-ld-muted",
  "log-teal":  "text-ld-teal",
  "log-green": "text-success",
  "log-amber": "text-warning",
};

export default function LandingTerminal() {
  return (
    <div className="terminal-section reveal max-w-5xl mx-auto px-6 md:px-16 py-24 transition-all duration-700 [&.active]:opacity-100 [&.active]:translate-y-0">
      <div className="terminal-grid flex flex-col lg:flex-row gap-12 items-start">
        {/* Terminal window */}
        <div className="terminal-window flex-1 bg-ld-terminal border border-ld-border rounded-[4px] overflow-hidden">
          <div className="terminal-header flex items-center gap-3 px-5 py-3 border-b border-ld-border bg-ld-surface/50">
            <div className="terminal-dots flex items-center gap-1.5">
              <div className="dot w-3 h-3 rounded-full bg-danger/70" />
              <div className="dot w-3 h-3 rounded-full bg-warning/70" />
              <div className="dot w-3 h-3 rounded-full bg-success/70" />
            </div>
            <div className="terminal-title flex-1 text-center font-dm-mono text-[11px] tracking-wider text-ld-muted">
              AONEX · Neural Processing Log
            </div>
            <div className="terminal-live flex items-center gap-1.5">
              <div className="live-dot w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="font-dm-mono text-[10px] text-success">LIVE</span>
            </div>
          </div>
          <div className="terminal-body px-5 py-4 space-y-1.5">
            {LOG_LINES.map((line, i) => (
              <div key={i}>
                <span className={`font-dm-mono text-xs leading-relaxed ${COLOR_MAP[line.cls]}`}>
                  {line.text}
                </span>
              </div>
            ))}
            <div>
              <span className="cursor font-dm-mono text-xs text-ld-teal animate-pulse">▌</span>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="terminal-copy flex-1 max-w-sm pt-6">
          <span className="section-label font-dm-mono text-[11px] tracking-[0.12em] uppercase text-ld-teal mb-6 block">
            Live Processing
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-normal leading-tight mb-5">
            Your data runs through a command centre, not a form.
          </h2>
          <p className="text-ld-dim text-sm leading-relaxed mb-8">
            Every ingestion job, enrichment run, sync operation, and competitive signal is logged
            in real time. You always know what Aonex is doing and why — with full audit trails per SKU.
          </p>
          <a
            href="#demo"
            className="inline-flex items-center px-6 py-3 text-sm font-medium font-dm-sans bg-ld-teal text-ld-bg hover:bg-ld-teal-dim transition-colors rounded-md"
          >
            See It Live
          </a>
        </div>
      </div>
    </div>
  );
}
