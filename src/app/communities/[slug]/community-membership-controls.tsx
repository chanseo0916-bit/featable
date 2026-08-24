"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveCommunity, requestCommunityMembership, updateMyCommunityVisibility } from "@/app/my/communities/[slug]/actions";

type Status = "requested" | "invited" | "active" | "declined" | "left" | null;

export function CommunityMembershipControls({ slug, loggedIn, initialStatus, initialPublic }: { slug: string; loggedIn: boolean; initialStatus: Status; initialPublic: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(initialStatus);
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [notice, setNotice] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, nextStatus?: Status) {
    if (!loggedIn) { router.push(`/login?next=/communities/${encodeURIComponent(slug)}`); return; }
    setNotice("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) { setNotice(result.error || "처리하지 못했습니다."); return; }
      if (nextStatus !== undefined) setStatus(nextStatus);
      router.refresh();
    });
  }

  if (status === "active") return <div className="community-membership-active">
    <strong>커뮤니티 멤버</strong>
    <label><input type="checkbox" checked={isPublic} disabled={pending} onChange={(event) => { const next = event.target.checked; setIsPublic(next); run(() => updateMyCommunityVisibility(slug, next)); }} /><span>내 프로필에 이 소속을 공개</span></label>
    <button type="button" disabled={pending} onClick={() => run(() => leaveCommunity(slug), "left")}>{pending ? "처리 중…" : "커뮤니티 나가기"}</button>
    {notice && <small>{notice}</small>}
  </div>;

  const waiting = status === "requested";
  return <div className="community-membership-join">
    <button type="button" disabled={pending || waiting} onClick={() => run(() => requestCommunityMembership(slug), status === "invited" ? "active" : "requested")}>
      {pending ? "처리 중…" : waiting ? "가입 신청 검토 중" : status === "invited" ? "멤버 초대 수락" : "커뮤니티 가입 신청"}
    </button>
    {status === "declined" && <span>다시 신청할 수 있어요.</span>}
    {notice && <small>{notice}</small>}
  </div>;
}
