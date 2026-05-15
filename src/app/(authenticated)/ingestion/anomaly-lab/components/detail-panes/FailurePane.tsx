import { useState } from "react";
import { api } from "@/lib/api";
import type { ReviewTaskDetail, SignalKind } from "../../types";

const TITLE: Partial<Record<SignalKind, string>> = {
  fetch_failed: "Fetch blocked",
  captcha_wall: "Captcha / bot wall",
  no_data_extracted: "No product data extracted",
  artifact_duplicate: "Duplicate URL",
};

export function FailurePane({
  task,
  onResolved,
  onError,
}: {
  task: ReviewTaskDetail;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const payload = task.signalPayload as {
    url?: string;
    domain?: string;
    reasonText?: string;
    evidence?: Record<string, unknown>;
  };
  const evidence = payload.evidence ?? {};
  const url = payload.url ?? "";
  const domain = payload.domain ?? "";
  const heading = TITLE[task.signalKind] ?? task.signalKind;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
        {heading}
      </p>
      <p className="text-sm text-foreground/90 mb-4">{payload.reasonText ?? task.signalPayload.reasonText}</p>

      <dl className="text-xs space-y-2 mb-6">
        {url && (
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-muted-foreground/60">URL</dt>
            <dd className="text-foreground/80 break-all">
              <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {url}
              </a>
            </dd>
          </div>
        )}
        {domain && (
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-muted-foreground/60">Domain</dt>
            <dd className="text-foreground/80">{domain}</dd>
          </div>
        )}
        {Object.entries(evidence).map(([k, v]) =>
          v === null || v === undefined ? null : (
            <div key={k} className="flex gap-3">
              <dt className="w-20 shrink-0 text-muted-foreground/60">{k}</dt>
              <dd className="text-foreground/80 break-all">
                {typeof v === "string" ? v : JSON.stringify(v)}
              </dd>
            </div>
          )
        )}
      </dl>

      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.rejectTask(task.id, "no_product_found", "Acknowledged blocked / failed URL");
              onResolved();
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/80 text-xs font-semibold hover:bg-white/[0.06] disabled:opacity-40"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}
