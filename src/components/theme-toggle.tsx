"use client";

/**
 * Unified light/dark toggle used in both the landing nav and the app sidebar.
 * Flips `data-theme` on <html> and persists it; the sun/moon icon swap is driven
 * by the `.sun-icon` / `.moon-icon` rules in globals.css. Pass `className` to
 * adopt the host surface's tokens (landing `--ld-*` vs app foreground tokens).
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("aonex-theme", next);
    } catch {
      /* storage unavailable — toggle still applies for this session */
    }
  };

  return (
    <button
      id="theme-toggle"
      onClick={toggle}
      aria-label="Toggle light or dark theme"
      className={["flex items-center justify-center transition-colors", className].join(" ")}
    >
      {/* Sun — shown in dark mode */}
      <svg className="sun-icon w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx={12} cy={12} r={5} />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      {/* Moon — shown in light mode */}
      <svg className="moon-icon w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
