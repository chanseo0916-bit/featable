"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  addCommunityFounder,
  addCommunityManager,
  inviteCommunityMember,
  linkCommunityBrand,
  linkCommunityEvent,
  removeCommunityFounder,
  removeCommunityManager,
  removeCommunityMember,
  reviewCommunityMembership,
  updateCommunityManagerRole,
  unlinkCommunityBrand,
  unlinkCommunityEvent,
} from "./actions";
import { formatDateKst } from "@/lib/datetime";

export interface CommunityFounderOption {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string;
  headline: string;
}

export interface CommunityBrandOption {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  tagline: string;
}

export interface CommunityEventOption {
  id: string;
  slug: string;
  name: string;
  coverUrl: string;
  startsAt: string;
}

export interface CommunityManagerOption {
  userId: string;
  name: string;
  email: string;
  role: "manager" | "editor";
}

export interface CommunityMembershipOption {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  displayRole: string;
  status: "requested" | "invited" | "active";
  isPublic: boolean;
}

interface Props {
  slug: string;
  isOwner: boolean;
  canManageMembers: boolean;
  founders: CommunityFounderOption[];
  founderCandidates: CommunityFounderOption[];
  brands: CommunityBrandOption[];
  brandCandidates: CommunityBrandOption[];
  events: CommunityEventOption[];
  eventCandidates: CommunityEventOption[];
  managers: CommunityManagerOption[];
  memberships: CommunityMembershipOption[];
}

type Result = { ok: true; savedAt: number } | { ok: false; error: string };

export function CommunityOperations({ slug, isOwner, canManageMembers, founders, founderCandidates, brands, brandCandidates, events, eventCandidates, managers, memberships }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [founderId, setFounderId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [eventId, setEventId] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerRole, setManagerRole] = useState<"manager" | "editor">("manager");
  const [memberEmail, setMemberEmail] = useState("");
  const requests = memberships.filter((item) => item.status === "requested");
  const activeMembers = memberships.filter((item) => item.status === "active");
  const invitedMembers = memberships.filter((item) => item.status === "invited");

  function run(action: () => Promise<Result>, success: string, reset?: () => void) {
    setNotice("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setNotice(result.error);
      reset?.();
      setNotice(success);
      router.refresh();
    });
  }

  return <section className="community-operations-console">
    <header className="community-operations-heading">
      <div><span>COMMUNITY OPERATIONS</span><h2>커뮤니티 운영</h2><p>함께하는 사람과 브랜드, 행사를 한 화면에서 연결하세요.</p></div>
      <div className="community-operation-summary"><span><b>{founders.length}</b> Founder</span><span><b>{brands.length}</b> 브랜드</span><span><b>{events.length}</b> 행사</span></div>
    </header>
    {notice && <p className="community-operation-notice">{notice}</p>}

    <div className="community-operation-grid">
      <OperationPanel number="01" label="PEOPLE" title="함께하는 Founder" description="공개 커뮤니티 페이지에 Founder 프로필 카드로 표시됩니다.">
        <AddRow value={founderId} onChange={setFounderId} disabled={pending} buttonLabel="Founder 연결" onAdd={() => founderId && run(() => addCommunityFounder(slug, founderId), "Founder를 연결했습니다.", () => setFounderId(""))}>
          <option value="">Founder 선택</option>
          {founderCandidates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.headline}</option>)}
        </AddRow>
        <div className="community-operation-list">{founders.length ? founders.map((item) => <article key={item.id}><img src={item.avatarUrl} alt="" /><div><strong>{item.name}</strong><span>{item.headline || "Featable Founder"}</span></div><button disabled={pending} onClick={() => run(() => removeCommunityFounder(slug, item.id), "Founder 연결을 해제했습니다.")}>해제</button></article>) : <EmptyRow text="아직 연결된 Founder가 없습니다." />}</div>
      </OperationPanel>

      <OperationPanel number="02" label="BRANDS" title="연결 브랜드" description="내가 소유하거나 팀으로 참여 중인 브랜드를 연결할 수 있습니다.">
        <AddRow value={brandId} onChange={setBrandId} disabled={pending} buttonLabel="브랜드 연결" onAdd={() => brandId && run(() => linkCommunityBrand(slug, brandId), "브랜드를 연결했습니다.", () => setBrandId(""))}>
          <option value="">브랜드 선택</option>
          {brandCandidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </AddRow>
        <div className="community-operation-list">{brands.length ? brands.map((item) => <article key={item.id}><img src={item.logoUrl} alt="" /><div><strong>{item.name}</strong><span>{item.tagline}</span></div><button disabled={pending} onClick={() => run(() => unlinkCommunityBrand(slug, item.id), "브랜드 연결을 해제했습니다.")}>해제</button></article>) : <EmptyRow text="아직 연결된 브랜드가 없습니다." />}</div>
      </OperationPanel>

      <OperationPanel number="03" label="EVENTS" title="커뮤니티 행사" description="내가 주최하거나 공동 주최하는 행사를 커뮤니티에 표시합니다.">
        <AddRow value={eventId} onChange={setEventId} disabled={pending} buttonLabel="행사 연결" onAdd={() => eventId && run(() => linkCommunityEvent(slug, eventId), "행사를 연결했습니다.", () => setEventId(""))}>
          <option value="">행사 선택</option>
          {eventCandidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </AddRow>
        <div className="community-operation-list">{events.length ? events.map((item) => <article key={item.id}><img src={item.coverUrl} alt="" /><div><strong>{item.name}</strong><span>{formatDateKst(item.startsAt)}</span></div><button disabled={pending} onClick={() => run(() => unlinkCommunityEvent(slug, item.id), "행사 연결을 해제했습니다.")}>해제</button></article>) : <EmptyRow text="아직 연결된 행사가 없습니다." />}</div>
      </OperationPanel>

      <OperationPanel number="04" label="MANAGERS" title="공동 운영자" description="대표 운영자는 Featable 계정을 운영팀에 추가할 수 있습니다.">
        {isOwner ? <div className="community-manager-invite"><input type="email" value={managerEmail} onChange={(event) => setManagerEmail(event.target.value)} placeholder="가입한 이메일" /><select value={managerRole} onChange={(event) => setManagerRole(event.target.value as "manager" | "editor")}><option value="manager">매니저</option><option value="editor">에디터</option></select><button disabled={pending || !managerEmail.trim()} onClick={() => run(() => addCommunityManager(slug, managerEmail, managerRole), "공동 운영자를 추가하고 알림을 보냈습니다.", () => setManagerEmail(""))}>운영팀 추가</button></div> : <p className="community-operation-readonly">공동 운영자 추가·삭제는 대표 운영자만 할 수 있습니다.</p>}
        <div className="community-operation-list manager-list">{managers.length ? managers.map((item) => <article key={item.userId}><i>{item.name.slice(0, 1).toUpperCase()}</i><div><strong>{item.name}</strong><span>{item.email}</span></div>{isOwner && <div className="community-manager-controls"><select value={item.role} disabled={pending} onChange={(event) => run(() => updateCommunityManagerRole(slug, item.userId, event.target.value as "manager" | "editor"), "운영자 권한을 변경했습니다.")}><option value="manager">매니저</option><option value="editor">에디터</option></select><button disabled={pending} onClick={() => run(() => removeCommunityManager(slug, item.userId), "공동 운영자를 삭제했습니다.")}>삭제</button></div>}</article>) : <EmptyRow text="아직 공동 운영자가 없습니다." />}</div>
      </OperationPanel>
    </div>
    <section className="community-membership-admin">
      <header><div><span>REAL MEMBERS</span><h3>커뮤니티 멤버</h3><p>운영 권한과 행사 참가 여부와 별개인 실제 커뮤니티 소속을 관리합니다.</p></div><div><b>{activeMembers.length}</b><small>활동 멤버</small><b>{requests.length}</b><small>가입 대기</small></div></header>
      {canManageMembers ? <div className="community-member-invite"><input type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="Featable 가입 이메일로 멤버 초대" /><button type="button" disabled={pending || !memberEmail.trim()} onClick={() => run(() => inviteCommunityMember(slug, memberEmail), "멤버 초대를 보냈습니다.", () => setMemberEmail(""))}>멤버 초대</button></div> : <p className="community-operation-readonly">에디터는 멤버 목록을 확인할 수 있고, 승인과 초대는 매니저가 담당합니다.</p>}
      {requests.length > 0 && <div className="community-membership-group"><h4>가입 신청 <span>{requests.length}</span></h4>{requests.map((item) => <article key={item.id}><MemberIdentity item={item} />{canManageMembers && <div className="community-membership-actions"><button type="button" disabled={pending} onClick={() => run(() => reviewCommunityMembership(slug, item.id, false), "가입 신청을 거절했습니다.")}>거절</button><button type="button" className="primary" disabled={pending} onClick={() => run(() => reviewCommunityMembership(slug, item.id, true), "커뮤니티 멤버로 승인했습니다.")}>멤버 승인</button></div>}</article>)}</div>}
      <div className="community-membership-group"><h4>현재 멤버 <span>{activeMembers.length}</span></h4>{activeMembers.length ? activeMembers.map((item) => <article key={item.id}><MemberIdentity item={item} /><span className="community-member-public-state">{item.isPublic ? "프로필 공개" : "소속 비공개"}</span>{canManageMembers && <button type="button" disabled={pending} onClick={() => run(() => removeCommunityMember(slug, item.id), "멤버를 내보냈습니다.")}>내보내기</button>}</article>) : <EmptyRow text="아직 활동 중인 멤버가 없습니다." />}</div>
      {invitedMembers.length > 0 && <div className="community-membership-group"><h4>초대 대기 <span>{invitedMembers.length}</span></h4>{invitedMembers.map((item) => <article key={item.id}><MemberIdentity item={item} /><span className="community-member-public-state">수락 대기 중</span></article>)}</div>}
    </section>
  </section>;
}

function MemberIdentity({ item }: { item: CommunityMembershipOption }) {
  return <><span className="community-member-admin-avatar">{item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : item.name.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{item.email} · {item.displayRole}</small></div></>;
}

function OperationPanel({ number, label, title, description, children }: { number: string; label: string; title: string; description: string; children: ReactNode }) {
  return <article className="community-operation-panel"><header><span>{number}</span><div><small>{label}</small><h3>{title}</h3><p>{description}</p></div></header>{children}</article>;
}

function AddRow({ value, onChange, disabled, buttonLabel, onAdd, children }: { value: string; onChange: (value: string) => void; disabled: boolean; buttonLabel: string; onAdd: () => void; children: ReactNode }) {
  return <div className="community-operation-add"><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>{children}</select><button type="button" onClick={onAdd} disabled={disabled || !value}>{buttonLabel}</button></div>;
}

function EmptyRow({ text }: { text: string }) {
  return <p className="community-operation-empty">{text}</p>;
}
