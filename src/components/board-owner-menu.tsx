"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteOwnBoardComment,
  deleteOwnBoardPost,
} from "@/app/board/actions";

type BoardOwnerMenuProps =
  | {
      kind: "post";
      postId: string;
      editHref: string;
    }
  | {
      kind: "comment";
      postId: string;
      commentId: string;
    };

/** Compact author-only menu. Server actions and RLS still enforce ownership. */
export function BoardOwnerMenu(props: BoardOwnerMenuProps) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const contentLabel = props.kind === "post" ? "게시글" : "댓글";

  useEffect(() => {
    if (!open) return;

    function closeMenu({ focusSummary = false } = {}) {
      if (detailsRef.current) detailsRef.current.open = false;
      if (focusSummary) {
        detailsRef.current?.querySelector<HTMLElement>("summary")?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) closeMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu({ focusSummary: true });
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function deleteContent() {
    const warning = props.kind === "post"
      ? "게시글을 삭제하면 댓글과 좋아요도 함께 삭제됩니다. 삭제할까요?"
      : "댓글을 삭제할까요?";
    if (!window.confirm(warning)) return;

    setError(null);
    startTransition(async () => {
      const result = props.kind === "post"
        ? await deleteOwnBoardPost({ postId: props.postId })
        : await deleteOwnBoardComment({
            postId: props.postId,
            commentId: props.commentId,
          });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      detailsRef.current?.removeAttribute("open");
      setOpen(false);
      if (props.kind === "post") {
        router.replace("/board?notice=post-deleted");
      } else {
        router.replace(`/board/${props.postId}?notice=comment-deleted#comments`);
      }
    });
  }

  return (
    <details
      className="board-owner-menu"
      ref={detailsRef}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        aria-label={`${contentLabel} 더보기`}
        aria-expanded={open}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </summary>
      <div className="board-owner-menu__popover">
        {props.kind === "post" && (
          <Link href={props.editHref}>수정</Link>
        )}
        <button type="button" onClick={deleteContent} disabled={pending}>
          {pending ? "삭제 중" : "삭제"}
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
