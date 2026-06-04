import Link from "next/link";

const STATS = [
  { val: "10×",  label: "Faster time to market" },
  { val: "98%",  label: "Catalog health rate" },
  { val: "5+",   label: "Global marketplaces, one sync" },
  { val: "4.3×", label: "Average ROAS improvement" },
];

export default function LandingHero() {
  return (
    <header className="hero relative min-h-screen flex items-center pt-[68px]">
      {/* Background grid */}
      <div className="hero-bg-grid absolute inset-0 pointer-events-none" />

      {/* Glow blobs */}
      <div className="hero-glow-1 absolute -top-20 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none" />
      <div className="hero-glow-2 absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none" />

      <div className="hero-content relative max-w-5xl mx-auto px-6 md:px-16 py-24 w-full">
        {/* Eyebrow */}
        <div className="hero-eyebrow flex flex-wrap items-center gap-4 mb-8">
          <span className="pill px-3 py-1 text-[11px] font-dm-mono tracking-[0.1em] uppercase border border-ld-teal/30 text-ld-teal rounded-full">
            v1.0 · Now Live
          </span>
          <span className="hero-label text-[11px] font-dm-mono tracking-[0.1em] uppercase text-ld-muted">
            Autonomous Commerce Engine · by Aonami
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-5xl md:text-7xl lg:text-[82px] font-normal leading-[1.04] tracking-tight mb-8 max-w-4xl">
          From raw data to{" "}
          <span className="text-ld-teal italic">market revenue</span>
          {" "}in one engine.
        </h1>

        {/* Sub */}
        <p className="hero-sub text-ld-dim text-lg md:text-xl font-normal leading-relaxed max-w-2xl mb-12">
          Aonex ingests your supplier data, enriches it with agentic AI, benchmarks it
          against live competitors, and distributes it across global marketplaces autonomously.
        </p>

        {/* CTAs */}
        <div className="hero-ctas flex flex-col sm:flex-row gap-4 mb-16">
          <a
            href="#demo"
            className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-medium font-dm-sans bg-ld-teal text-ld-bg hover:bg-ld-teal-dim transition-all rounded-md shadow-[0_10px_40px_-12px_rgb(var(--ld-teal)/0.6)] hover:shadow-[0_14px_50px_-12px_rgb(var(--ld-teal)/0.7)]"
          >
            Request a Demo
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-medium font-dm-sans border border-ld-border text-ld-text hover:border-ld-teal hover:text-ld-teal transition-colors rounded-md"
          >
            Explore the Platform
          </a>
        </div>

        {/* Stats */}
        <div className="hero-stats grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-ld-border">
          {STATS.map((s) => (
            <div key={s.val} className="stat-item">
              <div className="stat-item-val font-display text-4xl text-ld-teal font-normal leading-none mb-1">
                {s.val}
              </div>
              <div className="stat-item-label text-xs font-dm-sans text-ld-muted leading-snug">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
