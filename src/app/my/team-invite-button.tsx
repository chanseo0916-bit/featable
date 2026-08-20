"use client";

import { useState, useTransition } from "react";
import { createBrandInvitation } from "./team-actions";
import type { BrandMemberRole } from "./team-actions";

export function TeamInviteButton({ brandId, brandName }: { brandId: string; brandName: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<BrandMemberRole>("editor");
  const [pending, startTransition] = useTransition();

  function createInvite() {
    startTransition(async () => {
      setError("");
      const result = await createBrandInvitation(brandId, email, role);
      if (!result.ok) setError(result.error);
      else setInviteUrl(result.url);
    });
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return <div className="team-invite">
    <button type="button" onClick={() => setOpen((value) => !value)}>팀 초대</button>
    {open && <div className="team-invite-modal" role="presentation" onClick={() => setOpen(false)}><div className="team-invite-popover" role="dialog" aria-modal="true" aria-label={`${brandName} 팀원 초대`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="close" onClick={() => setOpen(false)} aria-label="닫기">×</button>
        <span>TEAM INVITATION</span>
        <strong>{brandName}에 팀원 초대</strong>
        <p>초대한 이메일 계정으로 로그인해야 참여할 수 있어요.</p>
        {inviteUrl ? <>
          <input value={inviteUrl} readOnly aria-label="팀 초대 링크" />
          <button type="button" className="primary" onClick={copyInvite}>{copied ? "복사됨" : "링크 복사"}</button>
        </> : <>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="team@company.com" aria-label="초대할 이메일" />
          <div className="team-invite-role" aria-label="초대 권한">
            <button type="button" className={role === "editor" ? "active" : ""} onClick={() => setRole("editor")}><strong>편집 가능</strong><small>브랜드와 프로덕트 관리</small></button>
            <button type="button" className={role === "viewer" ? "active" : ""} onClick={() => setRole("viewer")}><strong>보기만</strong><small>워크스페이스 열람</small></button>
          </div>
          <button type="button" className="primary" disabled={pending || !email.trim()} onClick={createInvite}>{pending ? "생성 중" : "초대 링크 만들기"}</button>
        </>}
        {error && <small>{error}</small>}
      </div></div>}
  </div>;
}
