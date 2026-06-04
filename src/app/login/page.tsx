"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { api, setToken } from "@/lib/api";
import ThemeToggle from "@/components/theme-toggle";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

const GOOGLE_ERRORS: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  state_mismatch: "Security check failed. Please try again.",
  google_token_failed: "Could not connect to Google. Please try again.",
  google_userinfo_failed: "Could not retrieve your Google account info.",
  session_expired: "Your session expired. Please sign in again.",
};

const HIGHLIGHTS = [
  "AI extraction from PDF, URL, or CSV — zero manual entry",
  "Enrichment, benchmarking, and sync in one engine",
  "Live sync across global marketplaces with health monitoring",
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const oauthError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errorMessage = err ?? (oauthError ? GOOGLE_ERRORS[oauthError] ?? null : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      router.push("/dashboard");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* ── Brand panel ── */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-border/[0.08] p-12">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-primary/20 blur-[130px]" />
          <div className="absolute bottom-[-6rem] right-[-4rem] size-[400px] rounded-full bg-primary/10 blur-[130px]" />
        </div>

        <div className="relative">
          <span className="font-serif text-lg font-bold tracking-tight text-foreground">AONEX</span>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Autonomous Commerce Engine
          </p>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl font-bold leading-[1.1] tracking-tight text-foreground">
            From raw data to <span className="text-primary">market revenue</span> in one engine.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Aonex ingests your supplier data, enriches it with agentic AI, and distributes it
            across global marketplaces — autonomously.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check size={12} strokeWidth={3} />
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-muted-foreground/60">
          © 2026 Aonex · All rights reserved
        </p>
      </aside>

      {/* ── Form panel ── */}
      <main className="relative flex items-center justify-center p-6 sm:p-12">
        <div className="absolute top-5 right-5">
          <ThemeToggle className="size-9 rounded-lg border border-border/[0.08] text-muted-foreground hover:text-foreground hover:bg-surface-hover" />
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile wordmark */}
          <div className="mb-8 lg:hidden">
            <span className="font-serif text-lg font-bold tracking-tight text-foreground">AONEX</span>
          </div>

          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Welcome back to Aonex.</p>

          <a
            href={`${API}/api/auth/google`}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-lg border border-border/[0.12] bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/[0.1]" />
            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.18em]">or</span>
            <div className="h-px flex-1 bg-border/[0.1]" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1.5 w-full rounded-lg border border-border/[0.1] bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-lg border border-border/[0.1] bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </label>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
                <AlertCircle size={14} className="shrink-0" />
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.7)]"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
