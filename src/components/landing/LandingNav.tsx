import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";

export default function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-16 h-[68px] bg-ld-bg/85 backdrop-blur-md border-b border-ld-border transition-colors">
      {/* Logo */}
      <div className="nav-brand">
        <a href="#" className="nav-brand-aonex flex items-center">
          <img src="/lightmode.svg" alt="Aonex" className="logo-light h-5" />
          <img src="/darkmode.svg"  alt="Aonex" className="logo-dark  h-5" />
        </a>
      </div>

      {/* Desktop nav links */}
      <div className="nav-links hidden md:flex items-center gap-8">
        {(["Platform", "How It Works", "Results", "Pricing"] as const).map((label) => (
          <a
            key={label}
            href={`#${label.toLowerCase().replace(/ /g, "-")}`}
            className="text-sm font-dm-sans text-ld-muted hover:text-ld-text transition-colors"
          >
            {label}
          </a>
        ))}
      </div>

      {/* Actions */}
      <div className="nav-ctas flex items-center gap-2">
        <ThemeToggle className="w-9 h-9 rounded-md text-ld-muted hover:text-ld-text hover:bg-ld-surface" />
        <Link
          href="/login"
          className="nav-cta hidden sm:inline-flex items-center px-5 py-2 text-sm font-medium font-dm-sans bg-ld-teal text-ld-bg hover:bg-ld-teal-dim transition-colors rounded-md"
        >
          Login
        </Link>
        <button className="hamburger md:hidden text-ld-text text-lg ml-2">☰</button>
      </div>
    </nav>
  );
}
