export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 bg-ld-surface overflow-hidden">
      <canvas id="topology-canvas" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-1000 [&.visible]:opacity-100" />

      {/* Header */}
      <div className="hiw-content relative max-w-5xl mx-auto px-6 md:px-16 mb-16">
        <div className="hiw-header">
          <span className="section-label font-dm-mono text-[11px] tracking-[0.12em] uppercase text-ld-teal mb-6 block">
            How It Works
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-normal leading-tight mb-6">
            <span className="word">Six </span>
            <span className="word">steps. </span>
            <span className="word">One </span>
            <span className="word">autonomous </span>
            <span className="word">loop.</span>
          </h2>
          <p className="text-ld-dim text-lg max-w-2xl">
            Follow a single supplier file through the full Aonex pipeline — from raw ingestion to
            live marketplace distribution.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="hiw-steps relative max-w-5xl mx-auto px-6 md:px-16">

        {/* ── Step 01: Ingestion ── */}
        <div id="step-01" className="step-row grid grid-cols-[56px_1fr] lg:grid-cols-[80px_1fr_200px] gap-6 py-12 border-b border-ld-border/20 transition-all duration-500 [&.border-visible]:border-ld-border [&.content-visible]:opacity-100">
          <div className="step-num-col">
            <div className="step-number font-display text-6xl font-normal leading-none text-ld-teal/20">01</div>
          </div>
          <div className="step-meta-centre col-span-1 lg:col-span-1">
            <div className="step-meta mb-4">
              <div className="step-pillar-name font-display text-2xl font-normal text-ld-text mb-1">Ingestion</div>
              <div className="step-sub-label font-dm-mono text-[10px] tracking-wider text-ld-teal">The Library · Phase 01</div>
            </div>
            <p className="step-action-text text-sm text-ld-dim leading-relaxed mb-6">
              A PDF spec sheet lands in the Terminal. The AI engine identifies source type, extracts every
              product attribute, and assigns a confidence score to each field — autonomously.
            </p>
            <div className="step-terminal border border-ld-border transition-colors duration-400 bg-ld-terminal rounded-[4px] overflow-hidden [&.border-revealed]:border-ld-border">
              <div className="step-terminal-body" id="terminal-body-01">
                <div className="terminal-flash h-px bg-ld-teal/30" />
              </div>
            </div>
          </div>
          <div className="step-outcome hidden lg:block">
            <div className="outcome-label font-dm-mono text-[10px] tracking-wider text-ld-muted mb-2 uppercase">Outcome</div>
            <div className="outcome-value font-display text-2xl font-normal text-ld-text">
              <span className="outcome-count-01" id="outcome-count-01">0</span> SKUs ready
            </div>
            <div className="outcome-sub font-dm-mono text-[10px] text-ld-muted mt-1">Confidence ≥ 80% · 2 routed to Anomaly Lab</div>
          </div>
        </div>

        {/* ── Step 02: Anomaly Lab ── */}
        <div id="step-02" className="step-row grid grid-cols-[56px_1fr] lg:grid-cols-[80px_1fr_200px] gap-6 py-12 border-b border-ld-border/20 transition-all duration-500 [&.border-visible]:border-ld-border [&.content-visible]:opacity-100">
          <div className="step-num-col">
            <div className="step-number font-display text-6xl font-normal leading-none text-ld-teal/20">02</div>
          </div>
          <div className="step-meta-centre">
            <div className="step-meta mb-4">
              <div className="step-pillar-name font-display text-2xl font-normal text-ld-text mb-1">Anomaly Lab</div>
              <div className="step-sub-label font-dm-mono text-[10px] tracking-wider text-ld-teal">Ingestion · Validation · Phase 02</div>
            </div>
            <p className="step-action-text text-sm text-ld-dim leading-relaxed mb-6">
              The 2 low-confidence SKUs route to Anomaly Lab. A reviewer sees the source PDF alongside each
              extracted field — colour-coded by confidence. Corrections are surgical.
            </p>
            <div className="confidence-bars space-y-4">
              {[{label:"Product Title",target:94},{label:"Weight (kg)",target:43,corrected:true},{label:"Material Spec",target:87}].map((bar) => (
                <div key={bar.label} className="conf-row transition-all duration-300 [&.visible]:opacity-100 [&.visible]:translate-y-0">
                  <div className="conf-header flex items-center gap-3 mb-1.5">
                    <span className="conf-label font-dm-mono text-[10px] text-ld-text flex-1">{bar.label}</span>
                    <span className="conf-value font-dm-mono text-[10px] text-ld-teal">0%</span>
                    {bar.corrected && (
                      <span className="conf-corrected font-dm-mono text-[9px] text-amber-400 hidden [&.visible]:inline">
                        Corrected by reviewer
                      </span>
                    )}
                  </div>
                  <div className="conf-bar-wrap h-1 bg-ld-border rounded-full overflow-hidden">
                    <div className="conf-bar-fill h-full w-0 bg-ld-teal transition-all duration-1000 [&.red]:bg-red-400 [&.amber]:bg-amber-400 [&.green]:bg-ld-teal" data-target={bar.target} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="step-outcome hidden lg:block">
            <div className="outcome-label font-dm-mono text-[10px] tracking-wider text-ld-muted mb-2 uppercase">Outcome</div>
            <div className="outcome-value font-display text-2xl font-normal text-ld-text">
              <span className="outcome-count-02" id="outcome-count-02">0</span> SKUs approved
            </div>
            <div className="outcome-sub font-dm-mono text-[10px] text-ld-muted mt-1">All 23 confident · Ready for enrichment</div>
          </div>
        </div>

        {/* ── Step 03: Drafting Room ── */}
        <div id="step-03" className="step-row grid grid-cols-[56px_1fr] lg:grid-cols-[80px_1fr_200px] gap-6 py-12 border-b border-ld-border/20 transition-all duration-500 [&.border-visible]:border-ld-border [&.content-visible]:opacity-100">
          <div className="step-num-col">
            <div className="step-number font-display text-6xl font-normal leading-none text-ld-teal/20">03</div>
          </div>
          <div className="step-meta-centre">
            <div className="step-meta mb-4">
              <div className="step-pillar-name font-display text-2xl font-normal text-ld-text mb-1">Drafting Room</div>
              <div className="step-sub-label font-dm-mono text-[10px] tracking-wider text-ld-teal">Enrichment · Phase 03</div>
            </div>
            <p className="step-action-text text-sm text-ld-dim leading-relaxed mb-6">
              The Enrichment engine generates high-converting copy for each SKU. The Drafting Room shows
              source truth vs. AI proposal side-by-side — accept globally or regenerate per field.
            </p>
            <div className="diff-pane-wrap grid grid-cols-2 gap-3 mb-3">
              <div className="diff-pane diff-pane-left relative p-4 bg-ld-bg border border-ld-border rounded-[2px] transition-colors [&.crossed]:border-red-400/30">
                <div className="diff-pane-label font-dm-mono text-[9px] tracking-wider uppercase text-ld-muted mb-2">System Truth</div>
                <div className="diff-left-text font-dm-sans text-xs text-ld-dim leading-relaxed min-h-[40px]" />
                <div className="strikethrough-line" />
              </div>
              <div className="diff-pane diff-pane-right relative p-4 bg-ld-bg border border-ld-border rounded-[2px] transition-colors [&.accepted]:border-ld-teal">
                <div className="diff-pane-label font-dm-mono text-[9px] tracking-wider uppercase text-ld-teal-dim mb-2">AI Proposal</div>
                <div className="diff-right-text font-dm-sans text-xs text-ld-text leading-relaxed min-h-[40px]" />
              </div>
            </div>
            <div className="diff-accepted-row flex items-center gap-2 transition-opacity duration-300 [&.visible]:opacity-100">
              <svg className="diff-check-svg w-4 h-4 text-green-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                <path className="diff-check-path" d="M2 8l4 4 8-8" />
              </svg>
              <span className="diff-accepted-label font-dm-mono text-[10px] text-green-400">Accepted · Field: Product Description</span>
            </div>
          </div>
          <div className="step-outcome hidden lg:block">
            <div className="outcome-label font-dm-mono text-[10px] tracking-wider text-ld-muted mb-2 uppercase">Outcome</div>
            <div className="outcome-value font-display text-2xl font-normal text-ld-text">
              <span className="outcome-score-03" id="outcome-score-03">0</span> / 100
            </div>
            <div className="outcome-sub font-dm-mono text-[10px] text-ld-muted mt-1">Linguistic Score · SEO Density: High · Confidence: 97%</div>
          </div>
        </div>

        {/* ── Step 04: Optimisation ── */}
        <div id="step-04" className="step-row grid grid-cols-[56px_1fr] lg:grid-cols-[80px_1fr_200px] gap-6 py-12 border-b border-ld-border/20 transition-all duration-500 [&.border-visible]:border-ld-border [&.content-visible]:opacity-100">
          <div className="step-num-col">
            <div className="step-number font-display text-6xl font-normal leading-none text-ld-teal/20">04</div>
          </div>
          <div className="step-meta-centre">
            <div className="step-meta mb-4">
              <div className="step-pillar-name font-display text-2xl font-normal text-ld-text mb-1">Optimisation</div>
              <div className="step-sub-label font-dm-mono text-[10px] tracking-wider text-ld-teal">SEO · GEO · Phase 04</div>
            </div>
            <p className="step-action-text text-sm text-ld-dim leading-relaxed mb-6">
              The engine generates market-specific SEO metadata and GEO-optimised content for AI search —
              per market, per language. Character counts and keyword density are tracked live.
            </p>
            <div className="opt-fields space-y-4">
              <div className="opt-field transition-all duration-300 [&.visible]:opacity-100 [&.visible]:translate-y-0">
                <div className="opt-field-header flex items-center justify-between mb-2">
                  <span className="opt-field-label font-dm-mono text-[10px] text-ld-muted">Meta Title</span>
                  <span className="opt-char-counter font-dm-mono text-[10px] text-ld-muted [&.complete]:text-ld-teal" id="opt-counter">[000 / 160 chars]</span>
                </div>
                <div className="opt-field-value opt-meta-value font-dm-sans text-xs text-ld-text min-h-[20px]" id="opt-meta-val" />
              </div>
              <div className="opt-field transition-all duration-300 [&.visible]:opacity-100 [&.visible]:translate-y-0">
                <div className="opt-field-header mb-2">
                  <span className="opt-field-label font-dm-mono text-[10px] text-ld-muted">SEO Tags</span>
                </div>
                <div className="tag-chips flex flex-wrap gap-2">
                  {["Cordless Drill","18V Power Tool","Brushless Motor","Keyless Chuck","Job Site Ready"].map(k => (
                    <span key={k} className="tag-chip font-dm-mono text-[9px] px-2 py-1 bg-ld-surface border border-ld-border text-ld-muted rounded-full transition-all duration-200 [&.visible]:opacity-100 [&.visible]:scale-100">{k}</span>
                  ))}
                </div>
              </div>
              <div className="opt-field transition-all duration-300 [&.visible]:opacity-100 [&.visible]:translate-y-0">
                <div className="opt-field-header mb-2">
                  <span className="opt-field-label font-dm-mono text-[10px] text-ld-muted">GEO Targets</span>
                </div>
                <div className="tag-chips flex flex-wrap gap-2">
                  {["IN","DE","GB","US","AU"].map(g => (
                    <span key={g} className="geo-chip font-dm-mono text-[10px] px-2.5 py-1 bg-ld-teal/10 border border-ld-teal/30 text-ld-teal rounded-full transition-all duration-200 [&.visible]:opacity-100 [&.visible]:scale-100">{g}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="step-outcome hidden lg:block">
            <div className="outcome-label font-dm-mono text-[10px] tracking-wider text-ld-muted mb-2 uppercase">Outcome</div>
            <div className="outcome-value font-display text-2xl font-normal text-ld-text">5 Markets</div>
            <div className="outcome-sub font-dm-mono text-[10px] text-ld-muted mt-1">Localised content ready · GEO score: 91%</div>
          </div>
        </div>

        {/* ── Step 05: Intelligence ── */}
        <div id="step-05" className="step-row grid grid-cols-[56px_1fr] lg:grid-cols-[80px_1fr_200px] gap-6 py-12 border-b border-ld-border/20 transition-all duration-500 [&.border-visible]:border-ld-border [&.content-visible]:opacity-100">
          <div className="step-num-col">
            <div className="step-number font-display text-6xl font-normal leading-none text-ld-teal/20">05</div>
          </div>
          <div className="step-meta-centre">
            <div className="step-meta mb-4">
              <div className="step-pillar-name font-display text-2xl font-normal text-ld-text mb-1">Opportunity Feed</div>
              <div className="step-sub-label font-dm-mono text-[10px] tracking-wider text-ld-teal">Intelligence · Phase 05</div>
            </div>
            <p className="step-action-text text-sm text-ld-dim leading-relaxed mb-6">
              While enrichment was running, the Intelligence engine detected a competitor out-of-stock event
              on Amazon DE — precisely matching our SKU category. An opportunity card was generated and scored.
            </p>
            <div id="opp-card" className="opportunity-card bg-ld-bg border border-ld-border p-5 rounded-[2px] transition-all duration-400 [&.visible]:opacity-100 [&.visible]:translate-y-0">
              <div className="opp-card-header flex items-center justify-between mb-3">
                <div className="opp-title font-dm-sans text-sm font-medium text-ld-text">Competitor OOS Event</div>
                <span className="opp-badge font-dm-mono text-[9px] tracking-wider uppercase bg-ld-teal/10 text-ld-teal px-2 py-0.5 rounded-[2px]">HIGH IMPACT</span>
              </div>
              <div className="opp-body font-dm-sans text-xs text-ld-dim leading-relaxed mb-4" />
              <div className="opp-actions flex gap-3">
                <button className="opp-action-btn font-dm-sans text-xs px-4 py-2 bg-ld-surface border border-ld-border text-ld-text hover:border-ld-teal hover:text-ld-teal transition-colors rounded-[2px]">
                  Execute Strategic Move
                </button>
                <button className="opp-action-btn font-dm-sans text-xs px-4 py-2 bg-ld-surface border border-ld-border text-ld-text hover:border-ld-teal hover:text-ld-teal transition-colors rounded-[2px]">
                  Adjust Pricing Model
                </button>
              </div>
            </div>
          </div>
          <div className="step-outcome hidden lg:block">
            <div className="outcome-label font-dm-mono text-[10px] tracking-wider text-ld-muted mb-2 uppercase">Outcome</div>
            <div className="outcome-value font-display text-2xl font-normal text-ld-teal">HIGH IMPACT</div>
            <div className="outcome-sub font-dm-mono text-[10px] text-ld-teal mt-1">Competitor OOS window · Amazon DE</div>
          </div>
        </div>

        {/* ── Step 06: Command ── */}
        <div id="step-06" className="step-row grid grid-cols-[56px_1fr] lg:grid-cols-[80px_1fr_200px] gap-6 py-12 border-ld-border/20 transition-all duration-500 [&.border-visible]:border-ld-border [&.content-visible]:opacity-100">
          <div className="step-num-col">
            <div className="step-number font-display text-6xl font-normal leading-none text-ld-teal/20">06</div>
          </div>
          <div className="step-meta-centre">
            <div className="step-meta mb-4">
              <div className="step-pillar-name font-display text-2xl font-normal text-ld-text mb-1">Command Centre</div>
              <div className="step-sub-label font-dm-mono text-[10px] tracking-wider text-ld-teal">Distribution · Ad Pilot · Phase 06</div>
            </div>
            <p className="step-action-text text-sm text-ld-dim leading-relaxed mb-6">
              One click syncs all 21 enriched SKUs across marketplace channels. Ad Pilot activates
              autonomously. Sync health is monitored continuously — Zalando shows a lag flag.
            </p>
            <div className="marketplace-table border border-ld-border rounded-[2px] overflow-hidden">
              <div className="marketplace-header grid grid-cols-4 px-4 py-2 bg-ld-surface border-b border-ld-border">
                {["Marketplace","Live Listings","Sync Health","Ad Pilot"].map(h => (
                  <span key={h} className="font-dm-mono text-[9px] tracking-wider uppercase text-ld-muted">{h}</span>
                ))}
              </div>
              {[
                {name:"Amazon EU",  barColor:"bg-ld-teal",   healthLabel:"Operational",healthColor:"text-green-400",on:true},
                {name:"Flipkart",   barColor:"bg-ld-teal",   healthLabel:"Operational",healthColor:"text-green-400",on:true},
                {name:"Zalando",    barColor:"bg-amber-400",healthLabel:"Lagging",    healthColor:"text-amber-400",on:false},
              ].map((row) => (
                <div key={row.name} className="marketplace-row grid grid-cols-4 items-center px-4 py-3 border-b last:border-b-0 border-ld-border">
                  <span className="market-name font-dm-sans text-xs text-ld-text">{row.name}</span>
                  <div className="market-bar-wrap h-1 bg-ld-border rounded-full overflow-hidden mr-4">
                    <div className={`market-bar-fill h-full w-0 ${row.barColor} transition-all duration-1000`} />
                  </div>
                  <span className={`sync-health-pill font-dm-mono text-[9px] ${row.healthColor}`}>{row.healthLabel}</span>
                  <div className={`ad-toggle-mini w-7 h-3.5 rounded-full relative transition-colors ${row.on ? "on bg-ld-teal" : "bg-ld-border"}`}>
                    <div className={`ad-toggle-mini-dot absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${row.on ? "translate-x-[14px]" : "translate-x-0.5"}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="step-outcome hidden lg:block">
            <div className="outcome-label font-dm-mono text-[10px] tracking-wider text-ld-muted mb-2 uppercase">Outcome</div>
            <div className="outcome-value font-display text-2xl font-normal text-ld-text">Live in 3 markets</div>
            <div className="outcome-sub font-dm-mono text-[10px] text-ld-muted mt-1">Ad Pilot active · ROAS tracking initialised</div>
          </div>
        </div>

      </div>
    </section>
  );
}
