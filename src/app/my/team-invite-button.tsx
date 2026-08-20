"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { createBrandInvitation, createInAppBrandInvitation, searchInviteCandidates, type BrandMemberRole, type InviteCandidate } from "./team-actions";

export function TeamInviteButton({ brandId, brandName }: { brandId: string; brandName: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"member" | "link">("member");
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<InviteCandidate[]>([]);
  const [selected, setSelected] = useState<InviteCandidate | null>(null);
  const [searching, setSearching] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<BrandMemberRole>("editor");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2 || !open || mode !== "member") return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const result = await searchInviteCandidates(brandId, query);
      if (cancelled) return;
      setSearching(false);
      if (!result.ok) { setError(result.error); setMembers([]); }
      else { setError(""); setMembers(result.members); }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [brandId, mode, open, query]);

  function changeQuery(value: string) {
    setQuery(value);
    setSelected(null);
    setNotice("");
    setMembers([]);
    setSearching(value.trim().length >= 2);
  }

  function changeMode(nextMode: "member" | "link") {
    setMode(nextMode);
    setError("");
    setNotice("");
    setSelected(null);
    setMembers([]);
    setSearching(false);
  }

  function sendSiteInvite() {
    if (!selected) return;
    startTransition(async () => {
      setError("");
      const result = await createInAppBrandInvitation(brandId, selected.userId, role);
      if (!result.ok) setError(result.error);
      else {
        setNotice(`${selected.displayName}님에게 사이트 알림을 보냈습니다.`);
        setMembers([]);
        setQuery("");
        setSelected(null);
      }
    });
  }

  function createLinkInvite() {
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
    {open && <div className="team-invite-modal" role="presentation" onClick={() => setOpen(false)}><div className="team-invite-popover team-invite-popover-v2" role="dialog" aria-modal="true" aria-label={`${brandName} 팀원 초대`} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="close" onClick={() => setOpen(false)} aria-label="닫기">×</button>
      <span>TEAM INVITATION</span>
      <strong>{brandName} 팀원 초대</strong>
      <p>Featable 멤버를 찾아 사이트 안에서 바로 초대하세요.</p>

      <div className="team-invite-tabs"><button type="button" className={mode === "member" ? "active" : ""} onClick={() => changeMode("member")}>멤버 검색</button><button type="button" className={mode === "link" ? "active" : ""} onClick={() => changeMode("link")}>초대 링크</button></div>

      <div className="team-invite-role" aria-label="초대 권한">
        <button type="button" className={role === "editor" ? "active" : ""} onClick={() => setRole("editor")}><strong>편집 가능</strong><small>브랜드와 프로덕트 관리</small></button>
        <button type="button" className={role === "viewer" ? "active" : ""} onClick={() => setRole("viewer")}><strong>보기만</strong><small>워크스페이스 열람</small></button>
      </div>

      {mode === "member" ? <div className="team-member-search">
        <label><span>이름으로 검색</span><input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Featable 멤버 이름 입력" autoFocus /></label>
        {searching && <p className="team-search-state">멤버를 찾고 있어요…</p>}
        {!searching && query.trim().length >= 2 && members.length === 0 && !error && <p className="team-search-state">검색 결과가 없어요. 아직 가입하지 않았다면 초대 링크를 보내세요.</p>}
        {members.length > 0 && <div className="team-search-results">{members.map((member) => <button type="button" className={selected?.userId === member.userId ? "selected" : ""} key={member.userId} onClick={() => setSelected(member)}>
          {member.avatarUrl ? <Image src={member.avatarUrl} alt="" width={40} height={40} unoptimized /> : <i>{member.displayName.slice(0, 1)}</i>}
          <span><strong>{member.displayName}</strong><small>{member.headline || (member.memberType === "team" ? "팀 멤버" : "Featable 멤버")}</small></span><b>{selected?.userId === member.userId ? "선택됨" : "+"}</b>
        </button>)}</div>}
        <button type="button" className="primary" disabled={pending || !selected} onClick={sendSiteInvite}>{pending ? "전송 중…" : "사이트 알림으로 초대"}</button>
      </div> : <div className="team-link-invite">
        {inviteUrl ? <><input value={inviteUrl} readOnly aria-label="팀 초대 링크" /><button type="button" className="primary" onClick={copyInvite}>{copied ? "복사됨" : "링크 복사"}</button></> : <><label><span>가입 전 팀원의 이메일</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="team@company.com" /></label><small>아직 Featable 계정이 없는 사람에게 링크를 직접 전달하세요.</small><button type="button" className="primary" disabled={pending || !email.trim()} onClick={createLinkInvite}>{pending ? "생성 중…" : "초대 링크 만들기"}</button></>}
      </div>}
      {notice && <div className="team-invite-success">✓ {notice}</div>}
      {error && <div className="team-invite-error">{error}</div>}
    </div></div>}
  </div>;
}
