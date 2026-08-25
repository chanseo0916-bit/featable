"use client";

import { useFormStatus } from "react-dom";

export function BoardLikeSubmit({
  liked,
  count,
}: {
  liked: boolean;
  count: number;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`board-like-button${liked ? " liked" : ""}`}
      type="submit"
      aria-pressed={liked}
      disabled={pending}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
      <span>{pending ? "반영 중" : liked ? "좋아요 취소" : "좋아요"}</span>
      <strong>{count}</strong>
    </button>
  );
}
