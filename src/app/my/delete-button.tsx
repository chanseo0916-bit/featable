"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBrand } from "@/app/submit/actions";

export function DeleteBrandButton({
  brandId,
  brandName,
}: {
  brandId: string;
  brandName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const ok = window.confirm(
      `'${brandName}' 브랜드와 소속 프로덕트가 모두 삭제됩니다.\n삭제 후에는 되돌릴 수 없습니다. 계속할까요?`,
    );
    if (!ok) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteBrand(brandId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="text-xs font-semibold text-muted hover:text-red-500 disabled:opacity-50"
      >
        {pending ? "삭제 중…" : "삭제"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </>
  );
}
