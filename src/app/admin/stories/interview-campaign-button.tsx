"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendInterviewMarketingEmail } from "../actions";

export function InterviewCampaignButton({ featureId, status, recipientCount, sentCount, failedCount, clickedCount }: { featureId: string; status?: string; recipientCount?: number; sentCount?: number; failedCount?: number; clickedCount?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const complete = status === "completed";
  const processing = status === "queued" || status === "sending";
  const label = complete ? `발송 ${sentCount ?? 0} · 클릭 ${clickedCount ?? 0} · 추가 확인` : processing ? `발송 중 ${sentCount ?? 0}/${recipientCount ?? 0}` : status === "failed" ? `실패 ${failedCount ?? 0} · 재시도` : "인터뷰 메일 보내기";

  function send() {
    if (!window.confirm("마케팅 수신에 동의한 회원에게 인터뷰 티저 이메일과 사이트 알림을 보낼까요?")) return;
    startTransition(async () => {
      setNotice(null);
      const result = await sendInterviewMarketingEmail(featureId);
      setNotice(result.error ?? result.message ?? "발송 요청을 처리했습니다.");
      router.refresh();
    });
  }

  return <div className="interview-campaign-control"><button type="button" onClick={send} disabled={pending || processing}>{pending ? "수신자 확인 중…" : label}</button>{notice && <span>{notice}</span>}</div>;
}
