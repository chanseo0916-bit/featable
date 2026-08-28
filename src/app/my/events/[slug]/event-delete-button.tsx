"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOwnedEvent } from "./actions";

export function EventDeleteButton({ eventId, slug, name }: {
  eventId: string;
  slug: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    const confirmed = window.confirm(
      `'${name}' 행사를 삭제할까요?\n신청자 데이터와 공지 내역도 함께 삭제되며 되돌릴 수 없습니다.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteOwnedEvent({ eventId, slug });
      if (!result.ok) {
        window.alert(result.error ?? "행사를 삭제하지 못했습니다.");
        return;
      }
      router.replace("/my/events");
      router.refresh();
    });
  }

  return <button className="button button-small button-danger" type="button" disabled={pending} onClick={remove}>{pending ? "삭제 중…" : "행사 삭제"}</button>;
}
