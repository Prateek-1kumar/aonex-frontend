const METRICS = [
  { val: "91%",   name: "Catalog Health Score",   sub: "Rolling average across active SKUs" },
  { val: "4.3×",  name: "ROAS Improvement",        sub: "Ad Pilot vs manual baseline" },
  { val: "<2s",   name: "Per-SKU Enrichment",      sub: "From raw input to publishable content" },
  { val: "99.8%", name: "Sync Reliability",        sub: "Marketplace operations without error" },
];

export default function LandingMetrics() {
  return (
    <div className="container reveal max-w-5xl mx-auto px-6 md:px-16 py-24 transition-all duration-700 [&.active]:opacity-100 [&.active]:translate-y-0" id="results">
      <span className="section-label font-dm-mono text-[11px] tracking-[0.12em] uppercase text-ld-teal mb-10 block">
        Performance Benchmarks
      </span>
      <div className="metrics-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-ld-border">
        {METRICS.map((m) => (
          <div key={m.name} className="metric-cell bg-ld-bg p-8">
            <div className="metric-val font-display text-5xl font-normal text-ld-teal mb-2">{m.val}</div>
            <div className="metric-name font-dm-sans text-sm font-medium text-ld-text mb-1">{m.name}</div>
            <div className="metric-sub font-dm-sans text-xs text-ld-muted">{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
