"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBrandVisibility } from "./actions";

export function BrandStatusButton({ brandId, published }: { brandId: string; published: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  return <button className={`dash-status-toggle ${published ? "on" : ""}`} type="button" disabled={pending} title={error ? "변경에 실패했습니다." : undefined} onClick={() => startTransition(async () => {
    setError(false);
    const result = await toggleBrandVisibility(brandId, !published);
    if (!result.ok) setError(true);
    else router.refresh();
  })}><i /><span>{pending ? "변경 중" : published ? "공개" : "비공개"}</span></button>;
}
