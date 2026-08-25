"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderateBoardReport, type BoardReportDecision } from "./actions";

export function BoardReportControls({
  reportId,
  target = "post",
  detail = false,
  redirectAfterDelete,
}: {
  reportId: string;
  target?: "post" | "comment";
  detail?: boolean;
  redirectAfterDelete?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(decision: BoardReportDecision) {
    if (
      decision === "delete" &&
      !window.confirm(
        target === "post"
          ? "신고된 게시글을 삭제할까요? 게시글·댓글·좋아요가 함께 삭제되며 되돌릴 수 없습니다."
          : "신고된 댓글을 삭제할까요? 되돌릴 수 없습니다.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await moderateBoardReport({ reportId, decision });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (decision === "delete" && target === "post") {
        const destination = redirectAfterDelete || (detail ? "/admin/board" : null);
        if (destination) {
          router.push(destination);
          return;
        }
      }
      router.refresh();
    });
  }

  return (
    <div className="admin-board-report-controls">
      <button
        type="button"
        className="admin-action-button admin-board-report-action"
        onClick={() => run("dismiss")}
        disabled={pending}
      >
        {pending ? "처리 중" : "기각"}
      </button>
      <button
        type="button"
        className="admin-action-button admin-board-report-action"
        onClick={() => run("hide")}
        disabled={pending}
      >
        {pending ? "처리 중" : "숨김"}
      </button>
      <button
        type="button"
        className="admin-action-button danger admin-board-report-action"
        onClick={() => run("delete")}
        disabled={pending}
      >
        {pending ? "처리 중" : "삭제"}
      </button>
      {error && <span className="admin-board-report-message" role="alert">{error}</span>}
    </div>
  );
}
