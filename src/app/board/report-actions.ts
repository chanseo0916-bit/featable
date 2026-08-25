"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  BOARD_REPORT_DETAIL_MAX_LENGTH,
  isBoardReportReason,
  type BoardReportReason,
} from "@/lib/board-reports";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type BoardReportResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

/** 로그인한 사용자가 게시글 또는 댓글을 한 번 신고합니다. DB RLS가 최종 권한을 강제합니다. */
export async function reportBoardContent(input: {
  postId: string;
  commentId?: string | null;
  reason: string;
  details?: string | null;
}): Promise<BoardReportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!input || typeof input !== "object") {
    return { ok: false, error: "신고 내용을 확인해주세요." };
  }

  if (!isUuid(input?.postId)) {
    return { ok: false, error: "게시글 식별자를 확인해주세요." };
  }

  const postId = input.postId.trim();
  const rawCommentId = typeof input.commentId === "string" ? input.commentId.trim() : "";
  if (rawCommentId && !isUuid(rawCommentId)) {
    return { ok: false, error: "댓글 식별자를 확인해주세요." };
  }

  if (!isBoardReportReason(input?.reason)) {
    return { ok: false, error: "신고 사유를 선택해주세요." };
  }

  const details = typeof input.details === "string" ? input.details.trim() : "";
  if (details.length > BOARD_REPORT_DETAIL_MAX_LENGTH) {
    return {
      ok: false,
      error: `상세 설명은 ${BOARD_REPORT_DETAIL_MAX_LENGTH}자 이하로 입력해주세요.`,
    };
  }

  const { error } = await supabase.from("board_reports").insert({
    post_id: postId,
    comment_id: rawCommentId || null,
    reporter_id: user.id,
    reason: input.reason as BoardReportReason,
    details: details || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 신고한 게시글 또는 댓글입니다." };
    }
    if (error.code === "42501") {
      return {
        ok: false,
        error: "본인이 작성했거나 공개되지 않은 콘텐츠는 신고할 수 없습니다.",
      };
    }
    console.error("[board] Failed to create report.", error);
    return { ok: false, error: "신고를 접수하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/admin/board");
  revalidatePath(`/admin/board/${postId}`);
  revalidatePath(`/board/${postId}`);
  return { ok: true, message: "신고가 접수되었습니다." };
}
