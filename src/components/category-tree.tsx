"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { TaxonomyTreeNode } from "@/lib/api";

export interface CategoryTreeProps {
  nodes: TaxonomyTreeNode[];
  uncategorizedCount: number;
  selectedNodeId: string | null;
  uncategorizedSelected?: boolean;
  onSelect: (nodeId: string | null) => void;  // null = "All products"
  onSelectUncategorized?: () => void;
}

// ─── internal tree structures ──────────────────────────────────────

interface TreeNode extends TaxonomyTreeNode {
  children: TreeNode[];
  /** Direct count + sum of ALL descendants */
  rolledUpCount: number;
}

function buildTree(flat: TaxonomyTreeNode[]): { roots: TreeNode[]; totalCount: number } {
  // Index by nodeId
  const byId = new Map<string, TreeNode>();
  for (const n of flat) {
    byId.set(n.nodeId, { ...n, children: [], rolledUpCount: n.productCount });
  }

  // Wire up children
  const roots: TreeNode[] = [];
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) {
      byId.get(n.parentId)!.children.push(n);
    } else {
      roots.push(n);
    }
  }

  // Sort children by displayName (recursive)
  function sortChildren(node: TreeNode) {
    node.children.sort((a, b) => a.displayName.localeCompare(b.displayName));
    for (const child of node.children) sortChildren(child);
  }
  roots.sort((a, b) => a.displayName.localeCompare(b.displayName));
  for (const root of roots) sortChildren(root);

  // Roll up counts bottom-up via post-order traversal
  function rollUp(node: TreeNode): number {
    let sum = node.productCount;
    for (const child of node.children) sum += rollUp(child);
    node.rolledUpCount = sum;
    return sum;
  }
  let totalCount = 0;
  for (const root of roots) totalCount += rollUp(root);

  // Only surface categories that actually contain products (rolled up). Empty
  // branches stay hidden and appear automatically as inventory lands under them
  // — so a client who only sells electronics sees just their tree, not all 151.
  function prune(list: TreeNode[]): TreeNode[] {
    return list
      .filter((n) => n.rolledUpCount > 0)
      .map((n) => ({ ...n, children: prune(n.children) }));
  }

  return { roots: prune(roots), totalCount };
}

// ─── single row ───────────────────────────────────────────────────

interface NodeRowProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selectedNodeId: string | null;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string | null) => void;
}

function NodeRow({ node, depth, expanded, selectedNodeId, onToggle, onSelect }: NodeRowProps) {
  const isExpanded = expanded.has(node.nodeId);
  const isSelected = selectedNodeId === node.nodeId;
  const hasChildren = node.children.length > 0;
  const isEmpty = node.rolledUpCount === 0;

  return (
    <>
      <div
        className={[
          "flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer select-none transition-colors",
          isSelected
            ? "bg-surface text-primary"
            : isEmpty
            ? "text-muted-foreground/40 hover:bg-surface-hover"
            : "text-foreground hover:bg-surface-hover",
        ].join(" ")}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* Chevron toggle — only occupies space when node has children */}
        <button
          className="shrink-0 flex items-center justify-center size-4 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.nodeId);
          }}
          aria-label={isExpanded ? "Collapse" : "Expand"}
          tabIndex={hasChildren ? 0 : -1}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            // Invisible spacer keeps label alignment uniform
            <span className="size-3" />
          )}
        </button>

        {/* Label */}
        <span
          className="flex-1 truncate"
          onClick={() => onSelect(node.nodeId)}
        >
          {node.displayName}
        </span>

        {/* Rolled-up count */}
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {node.rolledUpCount.toLocaleString()}
        </span>
      </div>

      {/* Children — only rendered when expanded */}
      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <NodeRow
              key={child.nodeId}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedNodeId={selectedNodeId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </>
      )}
    </>
  );
}

// ─── public component ─────────────────────────────────────────────

export default function CategoryTree({
  nodes,
  uncategorizedCount,
  selectedNodeId,
  uncategorizedSelected = false,
  onSelect,
  onSelectUncategorized,
}: CategoryTreeProps) {
  const { roots, totalCount } = useMemo(() => buildTree(nodes), [nodes]);

  // The tree is pruned to non-empty branches, so it's small — expand every
  // surviving branch by default so the categories with products are visible
  // without drilling in.
  const defaultExpanded = useMemo(() => {
    const ids = new Set<string>();
    const walk = (list: TreeNode[]) => {
      for (const n of list) {
        if (n.children.length > 0) {
          ids.add(n.nodeId);
          walk(n.children);
        }
      }
    };
    walk(roots);
    return ids;
  }, [roots]);
  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded);

  function handleToggle(nodeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  const allSelected = selectedNodeId === null && !uncategorizedSelected;

  return (
    <nav className="flex flex-col gap-0.5 text-sm">
      {/* "All products" row */}
      <div
        className={[
          "flex items-center gap-1 rounded-md px-2 py-1 cursor-pointer select-none transition-colors",
          allSelected
            ? "bg-surface text-primary"
            : "text-foreground hover:bg-surface-hover",
        ].join(" ")}
        onClick={() => onSelect(null)}
      >
        <span className="size-4 shrink-0" />
        <span className="flex-1">All products</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {totalCount.toLocaleString()}
        </span>
      </div>

      {/* Tree */}
      {roots.map((root) => (
        <NodeRow
          key={root.nodeId}
          node={root}
          depth={0}
          expanded={expanded}
          selectedNodeId={selectedNodeId}
          onToggle={handleToggle}
          onSelect={onSelect}
        />
      ))}

      {/* Uncategorized row — hidden when count is 0 */}
      {uncategorizedCount > 0 && (
        <div
          className={[
            "flex items-center gap-1 rounded-md px-2 py-1 cursor-pointer select-none transition-colors mt-1 border-t border-border/10 pt-2",
            uncategorizedSelected
              ? "bg-surface text-primary"
              : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
          ].join(" ")}
          onClick={() => onSelectUncategorized?.()}
        >
          <span className="size-4 shrink-0" />
          <span className="flex-1">Uncategorized</span>
          <span className="shrink-0 text-xs tabular-nums">
            {uncategorizedCount.toLocaleString()}
          </span>
        </div>
      )}
    </nav>
  );
}
