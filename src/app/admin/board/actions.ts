"use server";

import { revalidatePath } from "next/cache";
import { processBoardImageCleanup } from "@/lib/board-images-admin";
import { getBoardAdminAccess } from "./access";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BoardPostStatus = "published" | "hidden";
type BoardActionResult = { ok: true; message: string } | { ok: false; error: string };

export type BoardReportDecision = "dismiss" | "hide" | "delete";
type BoardReportActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function validPostId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

function validStatus(value: unknown): value is BoardPostStatus {
  return value === "published" || value === "hidden";
}

function validReportDecision(value: unknown): value is BoardReportDecision {
  return value === "dismiss" || value === "hide" || value === "delete";
}

function invalidPostId(): BoardActionResult {
  return { ok: false, error: "게시글 식별자를 확인해주세요." };
}

function revalidateBoard(postId: string) {
  revalidatePath("/board");
  revalidatePath(`/board/${postId}`);
  revalidatePath("/admin/board");
  revalidatePath(`/admin/board/${postId}`);
}

export async function setBoardPostStatus(input: {
  id: string;
  status: BoardPostStatus;
}): Promise<BoardActionResult> {
  const access = await getBoardAdminAccess();
  if (!access.ok) return { ok: false, error: access.error };
  if (!validPostId(input?.id)) return invalidPostId();
  if (!validStatus(input?.status)) {
    return { ok: false, error: "게시글 공개 상태를 확인해주세요." };
  }

  const postId = input.id.trim();
  const { data, error } = await access.admin
    .from("board_posts")
    .update({ status: input.status })
    .eq("id", postId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/board] Failed to update post status.", error);
    return { ok: false, error: "게시글 공개 상태를 변경하지 못했습니다." };
  }
  if (!data) return { ok: false, error: "게시글을 찾을 수 없습니다." };

  revalidateBoard(postId);
  return {
    ok: true,
    message: input.status === "published" ? "게시글을 공개했습니다." : "게시글을 숨겼습니다.",
  };
}

export async function deleteBoardPost(input: { id: string }): Promise<BoardActionResult> {
  const access = await getBoardAdminAccess();
  if (!access.ok) return { ok: false, error: access.error };
  if (!validPostId(input?.id)) return invalidPostId();

  const postId = input.id.trim();
  const { data, error } = await access.admin
    .from("board_posts")
    .delete()
    .eq("id", postId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/board] Failed to delete post.", error);
    return { ok: false, error: "게시글을 삭제하지 못했습니다." };
  }
  if (!data) return { ok: false, error: "게시글을 찾을 수 없습니다." };

  await processBoardImageCleanup();

  revalidateBoard(postId);
  return { ok: true, message: "게시글을 삭제했습니다." };
}

/** 관리자만 게시글·댓글 신고를 기각하거나 대상에 moderation 조치를 적용합니다. */
export async function moderateBoardReport(input: {
  reportId: string;
  decision: BoardReportDecision;
}): Promise<BoardReportActionResult> {
  const access = await getBoardAdminAccess();
  if (!access.ok) return { ok: false, error: access.error };
  if (!input || typeof input !== "object") {
    return { ok: false, error: "신고 처리 내용을 확인해주세요." };
  }
  if (!validPostId(input?.reportId)) {
    return { ok: false, error: "신고 식별자를 확인해주세요." };
  }
  if (!validReportDecision(input?.decision)) {
    return { ok: false, error: "신고 처리 방식을 확인해주세요." };
  }

  const reportId = input.reportId.trim();
  const { data, error } = await access.admin.rpc("moderate_board_report", {
    p_report_id: reportId,
    p_decision: input.decision,
    p_reviewer_id: access.userId,
  });

  if (error) {
    const message = `${error.message ?? ""} ${error.details ?? ""}`;
    if (message.includes("board_report_already_moderated")) {
      return { ok: false, error: "이미 처리된 신고입니다." };
    }
    if (
      message.includes("board_report_not_found") ||
      message.includes("board_report_target_not_found")
    ) {
      return { ok: false, error: "신고 또는 신고 대상을 찾을 수 없습니다." };
    }
    console.error("[admin/board] Failed to moderate board report.", error);
    return { ok: false, error: "신고를 처리하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  const result = data && typeof data === "object" ? data as Record<string, unknown> : null;
  const postId = result?.post_id;
  const commentId = result?.comment_id;
  if (!validPostId(postId) || (commentId !== null && commentId !== undefined && !validPostId(commentId))) {
    console.error("[admin/board] Invalid moderation result.", data);
    return { ok: false, error: "신고 처리 결과를 확인하지 못했습니다." };
  }

  revalidateBoard(postId);

  if (input.decision === "delete" && !commentId) {
    await processBoardImageCleanup();
  }

  if (input.decision === "dismiss") {
    return { ok: true, message: "신고를 기각했습니다." };
  }
  if (input.decision === "delete") {
    return {
      ok: true,
      message: commentId ? "신고된 댓글을 삭제했습니다." : "신고된 게시글을 삭제했습니다.",
    };
  }
  return {
    ok: true,
    message: commentId ? "댓글을 숨기고 관련 신고를 처리했습니다." : "게시글을 숨기고 관련 신고를 처리했습니다.",
  };
}
