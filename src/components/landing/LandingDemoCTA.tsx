export default function LandingDemoCTA() {
  return (
    <section
      className="demo-section reveal relative py-32 text-center overflow-hidden transition-all duration-700 [&.active]:opacity-100 [&.active]:translate-y-0"
      id="demo"
    >
      {/* Glow */}
      <div className="demo-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(26,193,206,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="demo-content relative max-w-xl mx-auto px-6">
        <span className="section-label font-dm-mono text-[11px] tracking-[0.12em] uppercase text-ld-teal mb-6 block">
          Book a Demo
        </span>
        <h2 className="font-display text-4xl md:text-5xl font-normal mb-4">
          See Aonex process your catalog live.
        </h2>
        <p className="text-ld-dim text-base mb-10">
          30 minutes. No slides. We ingest your actual data and show you what Aonex does with it.
        </p>
        <form id="demo-form" className="demo-form flex flex-col sm:flex-row gap-3 justify-center">
          <input
            type="email"
            id="demo-email"
            placeholder="Enter work email"
            required
            autoComplete="email"
            className="demo-input flex-1 bg-ld-surface border border-ld-border text-ld-text placeholder:text-ld-muted px-4 py-3 text-sm font-dm-sans outline-none focus:border-ld-teal transition-colors rounded-[2px] max-w-xs"
          />
          <button
            type="submit"
            className="btn btn-primary px-6 py-3 bg-ld-teal text-black text-sm font-medium font-dm-sans hover:bg-ld-text transition-colors rounded-[2px]"
          >
            Request Demo
          </button>
        </form>
        <div className="demo-note mt-4 text-xs font-dm-mono text-ld-muted">
          Enterprise teams only · Typically responds within 1 business day
        </div>
      </div>
    </section>
  );
}
