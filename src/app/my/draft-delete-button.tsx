"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMyProduct, deleteStudioDraft } from "./actions";

/**
 * 스튜디오 임시저장 목록에서 초안을 바로 삭제한다.
 * kind="draft"  → 아직 등록 전인 서버 초안(submission_drafts)
 * kind="product" → 비공개 상태로 저장된 실제 프로덕트
 */
export function DraftDeleteButton({
  kind,
  id,
  name,
}: {
  kind: "draft" | "product";
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    const message = kind === "product"
      ? `'${name}' 프로덕트를 삭제할까요?\n삭제 후에는 되돌릴 수 없습니다.`
      : `작성 중인 '${name}' 초안을 삭제할까요?\n삭제 후에는 되돌릴 수 없습니다.`;
    if (!window.confirm(message)) return;

    startTransition(async () => {
      setError("");
      const result = kind === "product"
        ? await deleteMyProduct(id)
        : await deleteStudioDraft(id);
      if (!result.ok) setError(result.error ?? "삭제에 실패했습니다.");
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      title={error || undefined}
      className="flex-none rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted transition-colors hover:border-red-400 hover:text-red-500 disabled:opacity-50"
    >
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}
