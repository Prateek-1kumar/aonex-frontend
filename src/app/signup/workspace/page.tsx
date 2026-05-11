"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setToken } from "@/lib/api";

function WorkspaceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const pendingToken = params.get("token") ?? "";

  const [tenantName, setTenantName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pendingToken) router.replace("/login?error=session_expired");
  }, [pendingToken, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { token } = await api.googleComplete(tenantName, pendingToken);
      setToken(token);
      router.push("/connections");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-12">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Name your workspace</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This is how your account will be identified across Aonex.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="font-medium">Workspace name</span>
          <input
            type="text"
            autoComplete="organization"
            required
            placeholder="e.g. Acme Store"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          type="submit"
          disabled={loading || !pendingToken}
          className="w-full border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:opacity-50"
        >
          {loading ? "Setting up…" : "Continue →"}
        </button>
      </form>
    </main>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense>
      <WorkspaceForm />
    </Suspense>
  );
}
