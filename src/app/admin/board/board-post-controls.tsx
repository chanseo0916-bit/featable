"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBoardPost, setBoardPostStatus, type BoardPostStatus } from "./actions";

export function BoardPostControls({
  id,
  status,
  title,
  detail = false,
  redirectAfterDelete,
}: {
  id: string;
  status: string;
  title?: string;
  detail?: boolean;
  redirectAfterDelete?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeStatus(nextStatus: BoardPostStatus) {
    startTransition(async () => {
      setError(null);
      const result = await setBoardPostStatus({ id, status: nextStatus });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    const label = title?.trim() || "이 게시글";
    if (!window.confirm(`'${label}'을(를) 삭제할까요? 게시글·댓글·좋아요가 함께 삭제되며 되돌릴 수 없습니다.`)) return;

    startTransition(async () => {
      setError(null);
      const result = await deleteBoardPost({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (redirectAfterDelete) router.push(redirectAfterDelete);
      else if (detail) router.push("/admin/board");
      else router.refresh();
    });
  }

  return (
    <div className="admin-row-actions admin-board-controls">
      {status === "published" ? (
        <button
          type="button"
          className="admin-action-button"
          onClick={() => changeStatus("hidden")}
          disabled={pending}
        >
          {pending ? "처리 중" : "숨김"}
        </button>
      ) : (
        <button
          type="button"
          className="admin-action-button"
          onClick={() => changeStatus("published")}
          disabled={pending}
        >
          {pending ? "처리 중" : "공개"}
        </button>
      )}
      <button
        type="button"
        className="admin-action-button danger"
        onClick={remove}
        disabled={pending}
      >
        {pending ? "처리 중" : "삭제"}
      </button>
      {error && <span className="admin-board-control-message" role="alert">{error}</span>}
    </div>
  );
}
