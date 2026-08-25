"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelPartnerInvitation, invitePartnerMember, linkPartnerCommunity, removePartnerMember, unlinkPartnerCommunity, updatePartnerMemberRole, type PartnerMemberRole } from "./workspace-actions";
import { formatDateKst } from "@/lib/datetime";

interface CommunityItem { id: string; slug: string; name: string; logoUrl: string; intro: string; }
interface MemberItem { userId: string; name: string; email: string; role: PartnerMemberRole; }
interface InvitationItem { id: string; email: string; role: PartnerMemberRole; expiresAt: string; }
interface Props { partnerId: string; isOwner: boolean; canManage: boolean; communities: CommunityItem[]; communityCandidates: CommunityItem[]; members: MemberItem[]; invitations: InvitationItem[]; }

export function PartnerWorkspace({ partnerId, isOwner, canManage, communities, communityCandidates, members, invitations }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PartnerMemberRole>("editor");
  const [inviteUrl, setInviteUrl] = useState("");
  const run = (action: () => Promise<{ ok: true; message: string; url?: string } | { ok: false; error: string }>, reset?: () => void) => startTransition(async () => {
    setNotice("");
    const result = await action();
    if (!result.ok) return setNotice(result.error);
    setNotice(result.message);
    if (result.url) setInviteUrl(result.url);
    reset?.();
    router.refresh();
  });

  return <section className="partner-workspace-console">
    <header><div><span>COMPANY WORKSPACE</span><h2>회사 운영</h2><p>회사 소속 커뮤니티와 함께 일할 팀원을 한곳에서 관리하세요.</p></div><div><b>{communities.length}</b><span>커뮤니티</span><b>{members.length + 1}</b><span>팀원</span></div></header>
    {notice && <p className="community-operation-notice">{notice}</p>}
    <div className="partner-workspace-grid">
      <article><header><small>COMMUNITIES</small><h3>회사 커뮤니티</h3><p>연결된 커뮤니티는 회사 팀의 편집자도 함께 관리할 수 있습니다.</p></header>
        {isOwner && communityCandidates.length > 0 && <div className="community-operation-add"><select value={communityId} onChange={(event) => setCommunityId(event.target.value)}><option value="">내 커뮤니티 선택</option>{communityCandidates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button disabled={pending || !communityId} onClick={() => run(() => linkPartnerCommunity(partnerId, communityId), () => setCommunityId(""))}>회사에 연결</button></div>}
        <div className="partner-workspace-community-list">{communities.map((item) => <div key={item.id}>{item.logoUrl ? <img src={item.logoUrl} alt="" /> : <i>{item.name.slice(0, 1)}</i>}<span><strong>{item.name}</strong><small>{item.intro}</small></span><Link href={canManage ? `/my/communities/${item.slug}` : `/communities/${item.slug}`}>{canManage ? "관리 →" : "보기 →"}</Link>{isOwner && <button disabled={pending} onClick={() => run(() => unlinkPartnerCommunity(partnerId, item.id))}>해제</button>}</div>)}</div>
        {isOwner && <Link className="partner-workspace-register" href="/partners/apply">새 커뮤니티 등록 문의 →</Link>}
      </article>
      <article><header><small>COMPANY TEAM</small><h3>회사 팀원</h3><p>초대받은 팀원은 역할에 따라 회사와 모든 소속 커뮤니티를 관리합니다.</p></header>
        {isOwner && <div className="partner-member-invite"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="team@company.com" /><select value={role} onChange={(event) => setRole(event.target.value as PartnerMemberRole)}><option value="manager">관리자</option><option value="editor">편집자</option><option value="viewer">뷰어</option></select><button disabled={pending || !email.trim()} onClick={() => run(() => invitePartnerMember(partnerId, email, role), () => setEmail(""))}>팀원 초대</button></div>}
        {inviteUrl && <div className="partner-invite-link"><input value={inviteUrl} readOnly /><button onClick={() => navigator.clipboard.writeText(inviteUrl)}>링크 복사</button></div>}
        <div className="partner-member-list">{members.map((item) => <div key={item.userId}><i>{item.name.slice(0, 1)}</i><span><strong>{item.name}</strong><small>{item.email}</small></span>{isOwner ? <select value={item.role} disabled={pending} onChange={(event) => run(() => updatePartnerMemberRole(partnerId, item.userId, event.target.value as PartnerMemberRole))}><option value="manager">관리자</option><option value="editor">편집자</option><option value="viewer">뷰어</option></select> : <em>{item.role}</em>}{isOwner && <button disabled={pending} onClick={() => run(() => removePartnerMember(partnerId, item.userId))}>삭제</button>}</div>)}</div>
        {isOwner && invitations.length > 0 && <div className="partner-pending-invites"><strong>대기 중인 초대</strong>{invitations.map((item) => <div key={item.id}><span>{item.email}<small>{item.role} · {formatDateKst(item.expiresAt)}까지</small></span><button disabled={pending} onClick={() => run(() => cancelPartnerInvitation(partnerId, item.id))}>취소</button></div>)}</div>}
      </article>
    </div>
  </section>;
}
