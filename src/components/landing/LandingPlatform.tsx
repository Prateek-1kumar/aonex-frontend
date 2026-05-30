const PILLARS = [
  { num: "01", dec: "✧", name: "Ingestion",    role: "The Library",   desc: "Drop a URL, PDF, or CSV. The AI engine extracts, classifies, and validates every attribute — zero manual entry." },
  { num: "02", dec: "⟡", name: "Enrichment",   role: "The Architect", desc: "Transforms technically accurate data into high-converting consumer narratives with surgical per-field AI control." },
  { num: "03", dec: "☼", name: "Intelligence", role: "The Scout",     desc: "Real-time competitive signals — competitor OOS, price arbitrage, demand surges — converted into prioritised actions." },
  { num: "04", dec: "○", name: "Optimisation", role: "The Magnet",    desc: "SEO and GEO content generation that dominates Google rankings and AI-powered search responses simultaneously." },
  { num: "05", dec: "◈", name: "Command",      role: "The Pilot",     desc: "One-click global distribution. Autonomous ad bidding. Full channel audit trail. Everything from a single cockpit." },
];

const FEATURES = [
  { num: "01", title: "Anomaly Lab",       tag: "Ingestion · Validation",        body: "When the AI detects low-confidence extractions, they're routed to a structured review interface. Reviewers see source documents alongside AI-extracted fields with colour-coded confidence thresholds — correcting only what needs correction." },
  { num: "02", title: "Ad Pilot",          tag: "Command · Ads",                 body: "The AI monitors campaign efficiency in real time and adjusts bids, budgets, and targeting autonomously. Switch to manual in one click — your optimisation state is preserved. Full event log across Google Ads and Meta." },
  { num: "03", title: "Drafting Room",     tag: "Enrichment · Drafting",         body: "Dual-pane diff view compares source truth with AI proposals field by field. Accept globally or regenerate surgically at ~150 tokens per field. Market Edge sidebar surfaces live competitive context mid-draft." },
  { num: "04", title: "Opportunity Feed",  tag: "Optimisation · Intelligence",   body: "Competitor liquidations, supply shortfalls, regional demand surges, and logistics shifts surface as prioritised, impact-rated cards. Execute strategic moves directly from the feed — confirmation to channel sync in seconds." },
];

export default function LandingPlatform() {
  return (
    <section id="platform" className="relative py-24 bg-ld-bg overflow-hidden">
      <canvas id="platform-canvas" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />

      <div className="platform-content relative max-w-5xl mx-auto px-6 md:px-16">

        {/* ── Section header ── */}
        <div className="platform-header mb-20">
          <span className="section-label font-dm-mono text-[11px] tracking-[0.12em] uppercase text-ld-teal mb-6 block">
            The Platform
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-normal leading-tight mb-6">
            <span className="word">One </span>
            <span className="word">platform. </span>
            <span className="word">Every </span>
            <span className="word">phase </span>
            <span className="word">of </span>
            <span className="word">commerce.</span>
          </h2>
          <p className="text-ld-dim text-lg max-w-2xl">
            Aonex operates as a five-phase execution layer — each pillar a specialist, all of them
            coordinated. Not a PIM. A PIM stores. Aonex acts.
          </p>
        </div>

        {/* ── Five pillars ── */}
        <div className="pillars-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-ld-border mb-20">
          {PILLARS.map((p) => (
            <div
              key={p.num}
              tabIndex={0}
              className="pillar-cell bg-ld-surface p-6 border border-ld-border transition-colors cursor-pointer hover:border-ld-teal [&.is-active]:border-ld-teal"
            >
              <div className="pillar-header flex justify-between mb-4">
                <div className="pillar-num font-dm-mono text-[11px] text-ld-teal">{p.num} —</div>
                <div className="pillar-dec text-ld-teal/60 text-base">{p.dec}</div>
              </div>
              <div className="pillar-name font-display text-xl mb-0.5">{p.name}</div>
              <div className="pillar-role font-dm-mono text-[10px] tracking-wider text-ld-teal mb-3">{p.role}</div>
              <div className="pillar-desc text-xs text-ld-dim leading-relaxed">{p.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Feature cells ── */}
        <div className="features-grid grid grid-cols-1 md:grid-cols-2 gap-px bg-ld-border mb-20">
          {FEATURES.map((f) => (
            <div key={f.num} className="feature-cell bg-ld-surface p-8 relative overflow-hidden">
              <div className="feature-bg-num absolute top-0 right-4 font-display text-[110px] leading-none text-ld-teal/[0.04] pointer-events-none select-none">
                {f.num}
              </div>
              <div className="feature-content relative">
                <h3 className="feature-title font-display text-2xl font-normal mb-3">{f.title}</h3>
                <p className="feature-body text-sm text-ld-dim leading-relaxed mb-4">{f.body}</p>
                <div className="feature-tag font-dm-mono text-[10px] tracking-widest uppercase text-ld-teal">{f.tag}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── PIM vs Aonex differentiator ── */}
        <div className="differentiator-section border border-ld-border mb-20">
          <div className="differentiator-inner grid grid-cols-1 md:grid-cols-2">
            {/* Left — PIM */}
            <div className="diff-col diff-col-left p-8 border-b md:border-b-0 md:border-r border-ld-border">
              <div className="diff-col-header mb-6">
                <span className="diff-col-badge pim inline-block px-3 py-1 text-[10px] font-dm-mono tracking-wider uppercase bg-[rgba(61,26,26,0.6)] text-[#A05050] border border-[#3D1A1A] rounded-[2px] mb-4">
                  Traditional PIM
                </span>
                <h3 className="font-display text-2xl font-normal mb-2">Stores. Organises. Waits.</h3>
                <p className="text-sm text-ld-dim">A PIM is a warehouse. You fill it, manage it, and extract from it manually.</p>
              </div>
              <ul className="diff-list space-y-3">
                {["Manual data entry and validation workflows", "Static exports to marketplaces via connectors", "No competitive context or market signals", "SEO is a separate, manual process", "Ad management requires a dedicated team"].map((item) => (
                  <li key={item} className="diff-item flex gap-3 text-sm text-ld-dim transition-all duration-300 [&.visible]:opacity-100 [&.visible]:translate-x-0">
                    <span className="diff-item-marker text-ld-muted shrink-0">—</span>
                    <span className="diff-item-text">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Right — Aonex */}
            <div className="diff-col diff-col-right p-8">
              <div className="diff-col-header mb-6">
                <span className="diff-col-badge aonex inline-block px-3 py-1 text-[10px] font-dm-mono tracking-wider uppercase bg-ld-teal/10 text-ld-teal border border-ld-teal/30 rounded-[2px] mb-4">
                  Aonex
                </span>
                <h3 className="font-display text-2xl font-normal mb-2">Ingests. Thinks. Executes.</h3>
                <p className="text-sm text-ld-dim">An autonomous engine. You define the rules once. It runs continuously.</p>
              </div>
              <ul className="diff-list space-y-3">
                {["AI extraction from any source — PDF, URL, CSV", "Live sync to 5+ marketplaces with health monitoring", "Real-time competitor intelligence built-in", "SEO and GEO content generated per-field, per-market", "Ad Pilot runs autonomously with full audit trail"].map((item) => (
                  <li key={item} className="diff-item flex gap-3 text-sm text-ld-dim transition-all duration-300 [&.visible]:opacity-100 [&.visible]:translate-x-0">
                    <span className="diff-item-marker text-ld-teal shrink-0">→</span>
                    <span className="diff-item-text">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── SKU Modal mockup ── */}
        <div className="sku-mockup-section flex flex-col lg:flex-row gap-12 items-start mb-20">
          {/* Copy */}
          <div className="sku-mockup-copy flex-1 lg:max-w-xs pt-4">
            <span className="section-label font-dm-mono text-[11px] tracking-[0.12em] uppercase text-ld-teal mb-4 block">
              Master Catalog Interface
            </span>
            <h3 className="font-display text-3xl font-normal mb-4">Every SKU. Every state. One interface.</h3>
            <p className="text-sm text-ld-dim leading-relaxed mb-6">
              The Aonex catalog interface gives you a complete view of each SKU across all six enrichment
              and distribution tabs — with a live audit trail and confidence scoring at every field.
            </p>
            <a href="#demo" className="inline-flex items-center px-6 py-3 text-sm font-medium font-dm-sans bg-ld-teal text-black hover:bg-ld-text transition-colors rounded-[2px]">
              See It Live
            </a>
          </div>

          {/* Modal window */}
          <div id="sku-modal" className="sku-modal-window flex-1 bg-ld-surface border border-ld-border rounded-[4px] overflow-hidden transition-all duration-500 [&.visible]:opacity-100 [&.visible]:translate-y-0">
            {/* Header */}
            <div className="sku-modal-header flex flex-wrap items-center gap-3 px-5 py-3 border-b border-ld-border bg-[rgba(13,18,20,0.4)]">
              <span className="sku-badge font-dm-mono text-[10px] tracking-wider uppercase bg-ld-teal/10 text-ld-teal px-2 py-0.5 rounded-[2px]">SKU-4821</span>
              <span className="sku-timestamp font-dm-mono text-[10px] text-ld-muted">Today · 14:32:07 UTC</span>
              <span className="sku-product-name font-dm-sans text-xs text-ld-text ml-auto">Bosch 18V LXT Drill Driver Kit</span>
            </div>
            {/* Tabs */}
            <div className="sku-tabs flex border-b border-ld-border px-5">
              {[{id:"tab-enrichment",label:"Enrichment"},{id:"tab-intelligence",label:"Intelligence"},{id:"tab-seo",label:"SEO / GEO"}].map((t, i) => (
                <span
                  key={t.id}
                  data-tab={t.id}
                  className={`sku-tab font-dm-sans text-xs py-3 px-4 cursor-pointer border-b-2 border-transparent transition-all ${i === 0 ? "active opacity-100 border-ld-teal text-ld-teal" : "opacity-50 text-ld-muted hover:text-ld-text"}`}
                >
                  {t.label}
                </span>
              ))}
            </div>
            {/* Tab body */}
            <div className="sku-modal-body p-5 text-sm min-h-[240px]">
              {/* Enrichment tab */}
              <div className="sku-tab-content active" id="tab-enrichment">
                <div className="sku-content-header flex items-start justify-between mb-4">
                  <h4 className="font-dm-sans text-sm font-medium text-ld-text">Product Enrichment</h4>
                  <div className="sku-mini-health text-right">
                    <div className="sku-mini-health-val font-display text-2xl text-ld-teal">94%</div>
                    <div className="sku-mini-health-label font-dm-mono text-[9px] text-ld-muted">Health Score</div>
                  </div>
                </div>
                <div className="sku-field-row mb-4">
                  <span className="sku-field-label flex items-center gap-2 font-dm-mono text-[10px] text-ld-muted mb-2">
                    Product Title
                    <span className="sku-ai-tag bg-ld-teal/10 text-ld-teal text-[9px] px-1.5 py-0.5 rounded-[2px]">AI Enhanced</span>
                  </span>
                  <div className="sku-diff-view space-y-1.5">
                    <span className="sku-old-val block text-xs text-ld-muted line-through">Bosch 18V Drill Kit</span>
                    <span className="sku-new-val block text-xs text-ld-text">Bosch Professional 18V LXT Brushless Drill Driver — Precision Torque Kit</span>
                  </div>
                </div>
                <div className="sku-field-row">
                  <span className="sku-field-label flex items-center gap-2 font-dm-mono text-[10px] text-ld-muted mb-2">
                    Description
                    <span className="sku-ai-tag bg-ld-teal/10 text-ld-teal text-[9px] px-1.5 py-0.5 rounded-[2px]">AI Rewritten</span>
                  </span>
                  <div className="sku-diff-view space-y-1.5">
                    <span className="sku-old-val block text-xs text-ld-muted line-through">18V power. Includes drill and battery. Plastic case.</span>
                    <span className="sku-new-val block text-xs text-ld-text">Professional-grade power meets job-site endurance. The Bosch 18V LXT features a high-efficiency brushless motor…</span>
                  </div>
                </div>
              </div>

              {/* Intelligence tab */}
              <div className="sku-tab-content hidden" id="tab-intelligence">
                <div className="sku-content-header mb-4">
                  <h4 className="font-dm-sans text-sm font-medium text-ld-text">AI Activity Feed</h4>
                </div>
                <div className="intelligence-feed space-y-2">
                  {[{title:"Title optimized for CTR",meta:"Today, 10:24 AM",impact:"+12% CTR"},{title:"Attributes standardized",meta:"Yesterday, 4:12 PM",impact:"Verified"},{title:"Category corrected (Power Tools)",meta:"April 24, 11:05 AM",impact:"99% Acc."}].map((a) => (
                    <div key={a.title} className="activity-card flex items-center justify-between p-3 bg-ld-bg border border-ld-border rounded-[2px]">
                      <div className="activity-info">
                        <span className="activity-title block text-xs text-ld-text mb-0.5">{a.title}</span>
                        <span className="activity-meta font-dm-mono text-[9px] text-ld-muted">{a.meta}</span>
                      </div>
                      <span className="activity-impact font-dm-mono text-[10px] text-ld-teal">{a.impact}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEO tab */}
              <div className="sku-tab-content hidden" id="tab-seo">
                <div className="sku-content-header mb-4">
                  <h4 className="font-dm-sans text-sm font-medium text-ld-text">SEO Performance</h4>
                </div>
                <div className="seo-grid grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="font-dm-mono text-[10px] text-ld-muted mb-2 block">Previous Keywords</span>
                    <div className="flex flex-wrap gap-1">
                      {["drill","bosch kit","18v power"].map(k => <span key={k} className="keyword-pill old text-[9px] font-dm-mono px-2 py-0.5 bg-ld-bg border border-ld-border text-ld-muted rounded-full">{k}</span>)}
                    </div>
                  </div>
                  <div>
                    <span className="font-dm-mono text-[10px] text-ld-muted mb-2 block">AI Suggested</span>
                    <div className="flex flex-wrap gap-1">
                      {["brushless drill","professional driver","cordless 18v kit"].map(k => <span key={k} className="keyword-pill new text-[9px] font-dm-mono px-2 py-0.5 bg-ld-teal/10 border border-ld-teal/30 text-ld-teal rounded-full">{k}</span>)}
                    </div>
                  </div>
                </div>
                <div className="seo-metrics-bar flex gap-6">
                  <div className="seo-metric">
                    <div className="seo-metric-val font-display text-3xl text-ld-teal">96 <span className="seo-trend text-sm font-dm-sans text-green-400">↑ 24</span></div>
                    <div className="seo-metric-label font-dm-mono text-[10px] text-ld-muted">SEO Score</div>
                  </div>
                  <div className="seo-metric">
                    <div className="seo-metric-val font-display text-3xl text-ld-teal">84% <span className="seo-trend text-sm font-dm-sans text-green-400">↑ 18%</span></div>
                    <div className="seo-metric-label font-dm-mono text-[10px] text-ld-muted">Search Vis.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stat row */}
            <div className="sku-stat-row flex border-t border-ld-border">
              {[{val:"6",label:"Tabs"},{val:"∞",label:"Audit Trail",teal:true}].map((s) => (
                <div key={s.label} className="sku-stat flex-1 flex flex-col items-center justify-center py-4 border-r last:border-r-0 border-ld-border">
                  <div className={`sku-stat-val font-display text-3xl ${s.teal ? "text-ld-teal" : "text-ld-text"}`}>{s.val}</div>
                  <div className="sku-stat-label font-dm-mono text-[10px] text-ld-muted">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Health block ── */}
        <div className="health-block border border-ld-border p-8 mb-20">
          <div className="health-block-header mb-10">
            <span className="section-label font-dm-mono text-[11px] tracking-[0.12em] uppercase text-ld-teal mb-4 block">
              Catalog Intelligence
            </span>
            <h3 className="font-display text-3xl font-normal mb-3">Live health scoring across every active SKU.</h3>
            <p className="text-sm text-ld-dim max-w-xl">
              Aonex scores each SKU continuously against enrichment quality, sync parity, and market
              performance metrics — surfacing critical items before they become revenue problems.
            </p>
          </div>

          <div className="health-inner-grid grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Ring */}
            <div className="health-ring-container relative flex flex-col items-center justify-center" data-health-score="78">
              <svg className="health-ring-svg w-40 h-40 -rotate-90" viewBox="0 0 160 160" aria-label="Catalog health score: 78%">
                <circle className="health-ring-bg" cx="80" cy="80" r="70" fill="none" stroke="#1E2D30" strokeWidth="8" />
                <circle
                  className="health-ring-fill"
                  cx="80" cy="80" r="70"
                  fill="none" stroke="#1AC1CE" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="440"
                  strokeDashoffset="440"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                <div className="health-ring-label font-display text-4xl text-ld-teal" id="health-score-num">0%</div>
                <div className="health-ring-sub font-dm-mono text-[10px] text-ld-muted mt-1">Catalog Health</div>
              </div>
            </div>

            {/* Status badges */}
            <div className="status-badges-group">
              <h4 className="automation-group-title font-dm-mono text-[10px] tracking-widest uppercase text-ld-muted mb-4">Channel Status</h4>
              <div className="status-badges space-y-3">
                {[{dot:"bg-green-400",name:"Amazon EU Sync",val:"HEALTHY"},{dot:"bg-red-400",name:"Flipkart Sync",val:"CRITICAL"},{dot:"bg-amber-400",name:"Zalando Sync",val:"LAGGING"}].map((b) => (
                  <div key={b.name} className="status-badge flex items-center gap-3 transition-all duration-300 [&.visible]:opacity-100 [&.visible]:translate-x-0">
                    <div className={`status-badge-dot w-2 h-2 rounded-full ${b.dot}`} />
                    <span className="status-badge-name font-dm-sans text-xs text-ld-text flex-1">{b.name}</span>
                    <span className="status-badge-val font-dm-mono text-[10px] text-ld-muted">{b.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="automation-group">
              <h4 className="automation-group-title font-dm-mono text-[10px] tracking-widest uppercase text-ld-muted mb-4">Automation State</h4>
              <div className="automation-toggles space-y-4">
                {["Ad Pilot", "Auto-Sync", "GEO Rewrite"].map((label) => (
                  <div key={label} className="toggle-row flex items-center justify-between">
                    <span className="toggle-label font-dm-sans text-sm text-ld-text">{label}</span>
                    <div className="toggle-pill w-10 h-5 bg-ld-border rounded-full relative cursor-pointer transition-colors [&.on]:bg-ld-teal" aria-label={`${label} enabled`}>
                      <div className="toggle-dot absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform [.on_&]:translate-x-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Platform CTA bar ── */}
        <div className="platform-cta-bar flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 border border-transparent transition-colors duration-500 [&.border-drawn]:border-ld-border rounded-[2px]">
          <div className="platform-cta-copy">
            <h3 className="font-display text-2xl font-normal mb-2">The engine is already running.</h3>
            <p className="text-sm text-ld-dim">See how Aonex processes your real catalog data in a live 30-minute session.</p>
          </div>
          <a
            href="#demo"
            className="btn btn-primary btn-scanline inline-flex items-center shrink-0 px-6 py-3 text-sm font-medium font-dm-sans bg-ld-teal text-black hover:bg-ld-text transition-colors rounded-[2px]"
          >
            Request a Demo
          </a>
        </div>

      </div>
    </section>
  );
}
