"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cancelEventRegistration, registerForEvent, type EventRegistrationState } from "./actions";

type RegistrationStatus = NonNullable<EventRegistrationState["status"]>;

const STATUS_COPY: Record<RegistrationStatus, { label: string; description: string }> = {
  pending: { label: "승인 대기", description: "주최자가 신청을 확인하고 있어요." },
  confirmed: { label: "신청 완료", description: "참가 신청이 확정됐어요." },
  waitlisted: { label: "대기 신청", description: "자리가 생기면 순서대로 확정됩니다." },
  rejected: { label: "승인되지 않음", description: "이번 신청은 승인되지 않았어요. 다시 신청할 수 있습니다." },
  cancelled: { label: "신청 취소", description: "취소된 신청입니다. 다시 신청할 수 있어요." },
};

export function EventRegistrationCard({
  eventId,
  slug,
  host,
  mode,
  applyUrl,
  capacity,
  approvalMode,
  closed,
  user,
  registration,
}: {
  eventId?: string;
  slug: string;
  host: string;
  mode: "external" | "internal" | "closed";
  applyUrl?: string;
  capacity?: number;
  approvalMode: "instant" | "manual";
  closed: boolean;
  user?: { name: string; email: string };
  registration?: { status: RegistrationStatus };
}) {
  const boundAction = eventId ? registerForEvent.bind(null, eventId, slug) : registerForEvent.bind(null, "", slug);
  const [state, action, pending] = useActionState(boundAction, {});
  const currentStatus = state.status ?? registration?.status;

  if (mode === "closed" || closed || (mode === "internal" && !eventId)) return <aside className="event-registration-panel closed"><span>REGISTRATION CLOSED</span><h2>신청이 마감됐어요.</h2><p>다른 행사를 둘러보고 새로운 만남을 찾아보세요.</p><Link className="button secondary" href="/events">다른 행사 보기</Link></aside>;

  if (mode === "external") return <aside className="event-registration-panel external">
    <span>EXTERNAL REGISTRATION</span><h2>외부 사이트에서 신청해요.</h2><p>신청 내역과 변경 사항은 연결되는 행사 사이트에서 관리됩니다.</p>
    {applyUrl ? <a className="button" href={applyUrl} target="_blank" rel="noopener noreferrer">외부 사이트에서 신청 <span aria-hidden="true">↗</span><span className="sr-only">새 창 열림</span></a> : <button className="button" disabled>신청 링크 준비 중</button>}
  </aside>;

  if (!user) return <aside className="event-registration-panel"><span>FEATABLE REGISTRATION</span><h2>Featable에서 바로 신청하세요.</h2><p>{approvalMode === "manual" ? "신청 후 주최자 승인을 거쳐 참가가 확정됩니다." : "신청 정보를 확인하면 바로 참가가 확정됩니다."}</p><Link className="button" href={`/login?next=${encodeURIComponent(`/events/${slug}`)}`}>로그인하고 신청하기</Link></aside>;

  if (currentStatus && currentStatus !== "cancelled" && currentStatus !== "rejected") {
    const copy = STATUS_COPY[currentStatus];
    return <aside className="event-registration-panel status" data-status={currentStatus}><span>MY REGISTRATION</span><h2>{copy.label}</h2><p>{copy.description}</p><Link className="text-link" href="/my/events">내 신청 내역 보기 →</Link><form action={cancelEventRegistration.bind(null, eventId ?? "", slug)}><button className="event-cancel-button" type="submit">신청 취소</button></form></aside>;
  }

  return <aside className="event-registration-panel"><span>FEATABLE REGISTRATION</span><h2>{currentStatus ? "다시 신청할까요?" : "이 행사에 참여할까요?"}</h2><p>{capacity ? `정원 ${capacity.toLocaleString("ko-KR")}명 · ` : ""}{approvalMode === "manual" ? "주최자 승인 후 확정" : "신청 즉시 확정"}</p><form action={action}>
    <label><span>이름</span><input name="name" defaultValue={user.name} minLength={2} maxLength={60} required /></label>
    <label><span>이메일</span><input name="email" type="email" defaultValue={user.email} maxLength={254} required /></label>
    <label><span>주최자에게 남길 말 <small>선택</small></span><textarea name="note" maxLength={500} placeholder="참여 목적이나 궁금한 점을 적어주세요." /></label>
    <label className="event-registration-consent"><input name="consented" type="checkbox" required /><span>신청 처리를 위해 이름·이메일·메모를 <strong>{host}</strong>에 제공하는 것에 동의합니다. <Link href="/privacy" target="_blank">개인정보 처리방침</Link></span></label>
    {state.error && <p className="event-registration-error" role="alert">{state.error}</p>}
    <button className="button" type="submit" disabled={pending}>{pending ? "신청 중…" : "Featable에서 신청하기"}</button>
  </form></aside>;
}
