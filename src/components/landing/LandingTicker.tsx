const ITEMS = [
  { label: "SYNC_HEALTH ·",        val: "OPERATIONAL" },
  { label: "SKUs ENRICHED TODAY ·", val: "2,841" },
  { label: "ACTIVE THREADS ·",      val: "147" },
  { label: "AVG HEALTH SCORE ·",    val: "91.4" },
  { label: "MARKETS ACTIVE ·",      val: "23" },
  { label: "AD PILOT EFFICIENCY ·", val: "96.2%" },
  { label: "ANOMALY DETECTION ·",   val: "99.1% PASS" },
  { label: "SYSTEM STATUS ·",       val: "OPTIMAL" },
];

export default function LandingTicker() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className="ticker-wrap overflow-hidden border-y border-ld-border bg-ld-surface py-3">
      <div className="ticker flex gap-0 animate-ticker w-max">
        {doubled.map((item, i) => (
          <div
            key={i}
            className="ticker-item flex items-center gap-3 px-8 shrink-0"
          >
            <div className="ticker-dot w-1.5 h-1.5 rounded-full bg-ld-teal" />
            <span className="ticker-label font-dm-mono text-[11px] tracking-[0.1em] uppercase text-ld-muted">
              {item.label}
            </span>
            <span className="ticker-val font-dm-mono text-[11px] tracking-[0.1em] uppercase text-ld-text">
              {item.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
