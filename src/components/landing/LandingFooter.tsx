export default function LandingFooter() {
  return (
    <footer className="border-t border-ld-border">
      <div className="max-w-5xl mx-auto px-6 md:px-16 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="footer-brand">
          <a href="#" className="nav-brand-aonex flex items-center">
            <img src="/lightmode.svg" alt="Aonex" className="logo-light h-4" />
            <img src="/darkmode.svg"  alt="Aonex" className="logo-dark  h-4" />
          </a>
        </div>
        <div className="footer-links flex flex-wrap items-center justify-center gap-6">
          {["Privacy", "Security", "Terms", "Documentation", "Contact Sales"].map((link) => (
            <a key={link} href="#" className="text-xs font-dm-sans text-ld-muted hover:text-ld-text transition-colors">
              {link}
            </a>
          ))}
        </div>
        <div className="footer-copy text-xs font-dm-mono text-ld-muted">
          © 2026 Aonex · All rights reserved
        </div>
      </div>
    </footer>
  );
}
