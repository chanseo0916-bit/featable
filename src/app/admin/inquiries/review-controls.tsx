"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewPartnershipInquiry } from "./actions";

export function InquiryReviewControls({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function review(decision: "approve" | "reject") { startTransition(async () => { const result = await reviewPartnershipInquiry({ id, decision, note }); setMessage(result.ok ? decision === "approve" ? "제휴를 승인했습니다." : "반려 처리했습니다." : result.error); router.refresh(); }); }
  return <div className="submission-review-controls"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="검토 메모 또는 반려 사유" /><div><button type="button" disabled={pending} onClick={() => review("reject")}>반려</button><button type="button" disabled={pending} onClick={() => review("approve")}>제휴 승인</button></div>{message && <p>{message}</p>}</div>;
}
