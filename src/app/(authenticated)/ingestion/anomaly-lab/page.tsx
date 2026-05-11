"use client";

import { useState } from "react";
import { Check, X, GitMerge, Flag, Edit3, CheckCircle2 } from "lucide-react";

type Severity = "high" | "medium" | "low";
type TaskType = "low_confidence" | "missing_attribute" | "duplicate" | "category_ambiguous" | "channel_error";

interface AnomalyTask {
  id: string;
  severity: Severity;
  type: TaskType;
  sku: string;
  age: string;
  field: string;
  rawValue: string;
  source: string;
  candidates: { label: string; confidence: number }[];
}

const MOCK_TASKS: AnomalyTask[] = [
  {
    id: "1",
    severity: "high",
    type: "missing_attribute",
    sku: "SKU-4821",
    age: "2 min ago",
    field: "battery_capacity_mah",
    rawValue: "5000",
    source: "Row 42, CSV upload",
    candidates: [
      { label: "battery_capacity_mah", confidence: 0.94 },
      { label: "storage_gb",           confidence: 0.21 },
      { label: "volume_ml",            confidence: 0.18 },
    ],
  },
  {
    id: "2",
    severity: "medium",
    type: "low_confidence",
    sku: "SKU-3302",
    age: "14 min ago",
    field: "resolution",
    rawValue: "4K Ultra HD",
    source: "Shopify connector",
    candidates: [
      { label: "display_resolution", confidence: 0.71 },
      { label: "screen_size",        confidence: 0.34 },
      { label: "refresh_rate",       confidence: 0.12 },
    ],
  },
  {
    id: "3",
    severity: "low",
    type: "category_ambiguous",
    sku: "SKU-1109",
    age: "1 hr ago",
    field: "category_path",
    rawValue: "Electronics > Audio",
    source: "CSV upload",
    candidates: [
      { label: "Headphones",      confidence: 0.62 },
      { label: "Speakers",        confidence: 0.58 },
      { label: "Audio Accessory", confidence: 0.41 },
    ],
  },
];

const FILTERS: { label: string; value: string }[] = [
  { label: "All",                value: "all" },
  { label: "Low Confidence",     value: "low_confidence" },
  { label: "Missing Attribute",  value: "missing_attribute" },
  { label: "Duplicate",          value: "duplicate" },
  { label: "Category Ambiguous", value: "category_ambiguous" },
  { label: "Channel Error",      value: "channel_error" },
];

const TYPE_LABELS: Record<TaskType, string> = {
  low_confidence:     "Low Confidence",
  missing_attribute:  "Missing Attribute",
  duplicate:          "Duplicate",
  category_ambiguous: "Category Ambiguous",
  channel_error:      "Channel Error",
};

const SEVERITY_DOT: Record<Severity, string> = {
  high:   "bg-red-400",
  medium: "bg-amber-400",
  low:    "bg-muted-foreground/40",
};

export default function AnomalyLabPage() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [selected, setSelected] = useState<AnomalyTask | null>(MOCK_TASKS[0] ?? null);
  const [filter, setFilter] = useState("all");

  const visible = filter === "all" ? tasks : tasks.filter((t) => t.type === filter);

  function resolve(id: string) {
    const remaining = tasks.filter((t) => t.id !== id);
    setTasks(remaining);
    setSelected(remaining[0] ?? null);
  }

  return (
    <div className="animate-in h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-4xl font-bold text-foreground">Anomaly Lab</h1>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Human Verification Queue
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {tasks.length > 0 && (
              <>
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary/100 text-xs font-bold">
                  {tasks.length} pending
                </span>
                <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold">
                  {tasks.filter((t) => t.severity === "high").length} high
                </span>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 mt-5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={[
                "px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors",
                filter === f.value
                  ? "bg-primary/10 text-primary/100 border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 size={40} className="text-emerald-400 mb-4" strokeWidth={1.5} />
          <p className="font-serif text-lg font-semibold text-foreground/80">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground">No items need review.</p>
        </div>
      ) : (
        <div className="flex gap-4" style={{ height: "calc(100vh - 280px)" }}>
          {/* Task list */}
          <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1">
            {visible.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelected(task)}
                className={[
                  "w-full text-left rounded-xl border p-4 transition-all duration-150",
                  selected?.id === task.id
                    ? "border-primary/25 bg-primary/5"
                    : "border-border/[0.07] bg-card hover:border-border/[0.12] hover:bg-white/[0.02]",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`size-2 rounded-full shrink-0 ${SEVERITY_DOT[task.severity]}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {task.severity}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground/90">{TYPE_LABELS[task.type]}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{task.sku}</p>
                <p className="text-[10px] text-muted-foreground/40 mt-2">{task.age}</p>
              </button>
            ))}
          </div>

          {/* Review panel */}
          {selected && (
            <div className="flex-1 rounded-xl border border-border/[0.08] bg-card p-6 overflow-y-auto scrollbar-thin">
              <div className="space-y-6">
                {/* Source evidence */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
                    Source Evidence
                  </p>
                  <div className="rounded-lg bg-white/[0.03] border border-border/[0.06] p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Field</span>
                      <span className="font-mono text-foreground/90">{selected.field}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Raw value</span>
                      <span className="font-mono text-primary/90">"{selected.rawValue}"</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Extracted from</span>
                      <span className="text-foreground/70">{selected.source}</span>
                    </div>
                  </div>
                </div>

                {/* Candidates */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
                    Mapping Candidates
                  </p>
                  <div className="space-y-2">
                    {selected.candidates.map((c, i) => (
                      <div key={c.label} className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground/40 w-4 font-mono">{i + 1}</span>
                        <div className="flex-1 flex items-center justify-between rounded-lg bg-white/[0.03] border border-border/[0.05] px-3 py-2">
                          <span className="text-sm font-mono text-foreground/80">{c.label}</span>
                          <span className={[
                            "text-xs font-bold tabular-nums",
                            c.confidence >= 0.8 ? "text-emerald-400" :
                            c.confidence >= 0.5 ? "text-amber-400" : "text-muted-foreground",
                          ].join(" ")}>
                            {(c.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
                    Actions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => resolve(selected.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary/100 text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      <Check size={13} /> Approve as-is
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 text-xs font-semibold hover:bg-white/[0.07] transition-colors">
                      <Edit3 size={13} /> Edit + Approve
                    </button>
                    <button
                      onClick={() => resolve(selected.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-red-400/80 text-xs font-semibold hover:bg-red-500/10 transition-colors"
                    >
                      <X size={13} /> Reject
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 text-xs font-semibold hover:bg-white/[0.07] transition-colors">
                      <GitMerge size={13} /> Merge
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 text-xs font-semibold hover:bg-white/[0.07] transition-colors">
                      <Flag size={13} /> Escalate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
