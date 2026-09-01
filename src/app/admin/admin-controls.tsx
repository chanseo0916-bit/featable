"use client";

import { useState, useTransition } from "react";
import { setFeatured, setStatus, type AdminTable } from "./actions";

export function RowControls({
  table,
  id,
  isFeatured,
  status,
  showFeatured = true,
}: {
  table: AdminTable;
  id: string;
  isFeatured: boolean;
  status: "draft" | "published" | "hidden";
  showFeatured?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (result.error) setError(result.error);
    });

  return (
    <div className="flex items-center gap-2">
      {showFeatured && <button
        disabled={pending}
        onClick={() => run(() => setFeatured(table, id, !isFeatured))}
        className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
          isFeatured
            ? "bg-accent text-white hover:bg-accent-hover"
            : "border border-border text-muted hover:border-accent hover:text-accent"
        }`}
      >
        {isFeatured ? "★ Featured" : "☆ Feature"}
      </button>}

      {status === "published" ? (
        <button
          disabled={pending}
          onClick={() => run(() => setStatus(table, id, "hidden"))}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-red-400 hover:text-red-500 disabled:opacity-50"
        >
          숨김
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => run(() => setStatus(table, id, "published"))}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent disabled:opacity-50"
        >
          공개
        </button>
      )}

      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
