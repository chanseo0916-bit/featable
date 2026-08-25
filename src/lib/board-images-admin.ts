import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "board-images";
const UPLOAD_TABLE = "board_post_images";
const CLEANUP_QUEUE_TABLE = "board_image_cleanup_queue";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const STORAGE_PATH_PATTERN =
  /^board\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;

type CleanupOptions = {
  paths?: string[];
  includeStalePending?: boolean;
  limit?: number;
};

type CleanupResult = {
  processed: number;
  failed: number;
  staleRemoved: number;
};

type QueueRow = {
  id: string;
  storage_path: string;
  processed_at: string | null;
  attempts: number | null;
  last_attempt_at: string | null;
};

type PendingUploadRow = {
  id: string;
  storage_path: string;
};

function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || /relation .* does not exist/i.test(error?.message ?? "");
}

function safeBoardImagePath(path: string): boolean {
  return STORAGE_PATH_PATTERN.test(path);
}

function normalizedLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(limit as number), 1), MAX_LIMIT);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
}

/**
 * Removes orphaned board images and advances cleanup queue rows.
 *
 * The function intentionally treats missing migration tables as an empty
 * queue so a cron deployment can be rolled out before migration 56 is run.
 */
export async function processBoardImageCleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
  const result: CleanupResult = { processed: 0, failed: 0, staleRemoved: 0 };
  const admin = createAdminClient();
  if (!admin) {
    console.error("[board-images] Admin client is not configured; cleanup skipped.");
    return result;
  }

  const limit = normalizedLimit(options.limit);
  const includeStalePending = options.includeStalePending ?? true;
  const explicitPaths = Array.from(
    new Set((options.paths ?? []).filter((path): path is string => typeof path === "string" && safeBoardImagePath(path))),
  ).slice(0, limit);

  for (const path of explicitPaths) {
    const { error } = await admin.storage.from(BUCKET).remove([path]);
    if (error) {
      result.failed += 1;
      console.error("[board-images] Failed to remove queued storage path.", error);
      continue;
    }
    result.processed += 1;
    const { error: queueError } = await admin
      .from(CLEANUP_QUEUE_TABLE)
      .update({ processed_at: new Date().toISOString(), last_error: null })
      .eq("storage_path", path)
      .is("processed_at", null);
    if (queueError && !isMissingTable(queueError)) {
      console.error("[board-images] Failed to mark explicit cleanup path processed.", queueError);
    }
  }

  const queueResult = await admin
    .from(CLEANUP_QUEUE_TABLE)
    .select("id,storage_path,processed_at,attempts,last_attempt_at")
    .is("processed_at", null)
    .order("queued_at", { ascending: true })
    .limit(limit);

  if (queueResult.error && !isMissingTable(queueResult.error)) {
    console.error("[board-images] Failed to read cleanup queue.", queueResult.error);
  }

  for (const row of (queueResult.data ?? []) as QueueRow[]) {
    if (!row.id || !safeBoardImagePath(row.storage_path)) {
      result.failed += 1;
      console.error("[board-images] Refusing an unsafe cleanup queue path.", { id: row.id });
      await admin
        .from(CLEANUP_QUEUE_TABLE)
        .update({ last_error: "unsafe board image path", last_attempt_at: new Date().toISOString(), attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id);
      continue;
    }

    const nextAttempts = (row.attempts ?? 0) + 1;
    const attemptAt = new Date().toISOString();
    let claimQuery = admin
      .from(CLEANUP_QUEUE_TABLE)
      .update({ attempts: nextAttempts, last_attempt_at: attemptAt, last_error: null })
      .eq("id", row.id)
      .is("processed_at", null);
    claimQuery = row.last_attempt_at
      ? claimQuery.eq("last_attempt_at", row.last_attempt_at)
      : claimQuery.is("last_attempt_at", null);
    const { data: claimed, error: claimError } = await claimQuery.select("id").maybeSingle();

    if (claimError) {
      result.failed += 1;
      console.error("[board-images] Failed to claim cleanup queue row.", claimError);
      continue;
    }
    if (!claimed) continue;

    const { error: storageError } = await admin.storage.from(BUCKET).remove([row.storage_path]);
    if (storageError) {
      result.failed += 1;
      console.error("[board-images] Failed to remove cleanup queue image.", storageError);
      await admin
        .from(CLEANUP_QUEUE_TABLE)
        .update({ last_error: errorMessage(storageError) })
        .eq("id", row.id);
      continue;
    }

    result.processed += 1;
    await admin
      .from(CLEANUP_QUEUE_TABLE)
      .update({ processed_at: new Date().toISOString(), last_error: null })
      .eq("id", row.id);
  }

  if (!includeStalePending) return result;

  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const staleResult = await admin
    .from(UPLOAD_TABLE)
    .select("id,storage_path")
    .eq("status", "pending")
    .lt("created_at", staleBefore)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (staleResult.error) {
    if (!isMissingTable(staleResult.error)) {
      console.error("[board-images] Failed to read stale pending uploads.", staleResult.error);
    }
    return result;
  }

  for (const row of (staleResult.data ?? []) as PendingUploadRow[]) {
    if (!row.id || !safeBoardImagePath(row.storage_path)) {
      result.failed += 1;
      console.error("[board-images] Refusing an unsafe stale image path.", { id: row.id });
      continue;
    }

    const { data: deletedUpload, error: deleteError } = await admin
      .from(UPLOAD_TABLE)
      .delete()
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (deleteError) {
      result.failed += 1;
      console.error("[board-images] Failed to claim stale image record.", deleteError);
      continue;
    }
    if (!deletedUpload) continue;

    const { error: storageError } = await admin.storage.from(BUCKET).remove([row.storage_path]);
    if (storageError) {
      result.failed += 1;
      console.error("[board-images] Failed to remove stale pending image.", storageError);
      // Deleting the pending row already creates a cleanup-queue row via the
      // migration trigger. Leave it unprocessed so the next cron can retry.
      continue;
    }

    result.processed += 1;
    result.staleRemoved += 1;
    const { error: queueError } = await admin
      .from(CLEANUP_QUEUE_TABLE)
      .update({ processed_at: new Date().toISOString(), last_error: null })
      .eq("storage_path", row.storage_path)
      .is("processed_at", null);
    if (queueError && !isMissingTable(queueError)) {
      console.error("[board-images] Failed to mark stale cleanup path processed.", queueError);
    }
  }

  return result;
}
