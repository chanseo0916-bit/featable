"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewPartnerSubmission } from "./actions";

export function SubmissionReviewControls({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function review(decision: "approve" | "reject") {
    setMessage("");
    startTransition(async () => {
      const result = await reviewPartnerSubmission({ id, decision, note });
      if (!result.ok) return setMessage(result.error ?? "처리하지 못했습니다.");
      setMessage(result.path ? `승인 및 공개 완료: ${result.path}` : "보완 요청을 보냈습니다.");
      router.refresh();
    });
  }
  return <div className="submission-review-controls"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="승인 메모 또는 보완 요청 내용을 입력하세요." /><div><button type="button" disabled={pending} onClick={() => review("reject")}>보완 요청</button><button type="button" disabled={pending} onClick={() => review("approve")}>승인하고 공개</button></div>{message && <p>{message}</p>}</div>;
}
