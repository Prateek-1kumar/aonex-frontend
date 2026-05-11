"use client";

import { useEffect, useState } from "react";
import Nango from "@nangohq/frontend";
import { api } from "@/lib/api";

interface Connection {
  marketplace: string;
  status: string;
  connectedAt?: string;
}

export default function ConnectionsPage() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setConns(await api.listConnections());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function connect(marketplace: "shopify" | "amazon" | "ebay") {
    setBusy(marketplace);
    setError(null);
    try {
      const { token } = await api.startConnect(marketplace);
      const nango = new Nango({
        publicKey: process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY ?? "",
        connectSessionToken: token
      });
      // Opens the Nango Connect popup. Nango handles the OAuth dance,
      // stores tokens, then fires the 'auth' webhook to our backend.
      await nango.openConnectUI({
        onEvent: (event) => {
          if (event.type === "close") void load();
        }
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function syncNow(marketplace: string) {
    setBusy(marketplace);
    try {
      await api.triggerSync(marketplace);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revoke(marketplace: string) {
    if (!confirm(`Revoke ${marketplace} connection?`)) return;
    setBusy(marketplace);
    try {
      await api.revoke(marketplace);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-12">
      <h1 className="text-2xl font-semibold tracking-tight">Marketplace connections</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Phase 1: Shopify is live. Amazon, eBay, Walmart, Etsy in upcoming phases.
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Connect new</h2>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void connect("shopify")}
            disabled={busy !== null}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy === "shopify" ? "Connecting…" : "Connect Shopify"}
          </button>
          <button
            disabled
            title="Phase 3"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-400"
          >
            Connect Amazon (Phase 3)
          </button>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Active</h2>
        {conns.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No connections yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
            {conns.map((c) => (
              <li key={c.marketplace} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium capitalize">{c.marketplace}</div>
                  <div className="text-xs text-neutral-500">
                    {c.status}
                    {c.connectedAt ? ` · since ${new Date(c.connectedAt).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void syncNow(c.marketplace)}
                    disabled={busy !== null || c.status !== "active"}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50"
                  >
                    Sync now
                  </button>
                  <button
                    onClick={() => void revoke(c.marketplace)}
                    disabled={busy !== null}
                    className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
