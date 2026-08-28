"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerForEvent, cancelEventRegistration, type EventRegistrationState } from "../actions";
import { SeedSelect } from "@/components/seed-select";

type RegistrationStatus = NonNullable<EventRegistrationState["status"]>;

type Field = { id: string; label: string; type: "text" | "select" | "textarea"; required?: boolean; placeholder?: string; options?: string[] };

const STATUS_COPY: Record<RegistrationStatus, { label: string; description: string; tone: "informative" | "warning" | "positive" | "critical" | "neutral" }> = {
  verification_pending: { label: "신청 처리 중", description: "신청 정보를 처리하고 있어요. 잠시 후 다시 확인해주세요.", tone: "informative" },
  pending: { label: "승인 대기", description: "주최자가 신청을 확인하고 있어요.", tone: "warning" },
  confirmed: { label: "신청 완료", description: "참가 신청이 확정됐어요.", tone: "positive" },
  waitlisted: { label: "대기 신청", description: "자리가 생기면 순서대로 확정됩니다.", tone: "informative" },
  rejected: { label: "승인되지 않음", description: "이번 신청은 승인되지 않았어요. 다시 신청할 수 있습니다.", tone: "critical" },
  cancelled: { label: "신청 취소", description: "취소된 신청입니다. 다시 신청할 수 있어요.", tone: "neutral" },
};

const input =
  "block w-full h-11 rounded-lg border border-border bg-white px-4 text-[15px] text-fg-strong placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function ApplicationForm({
  eventId, slug, host, capacity, approvalMode, isPaid, paymentAccount, paymentNotice,
  registrationFields, user, registration, closed,
}: {
  eventId: string; slug: string; host: string; capacity: number | null;
  approvalMode: "instant" | "manual"; isPaid: boolean;
  paymentAccount: string | null; paymentNotice: string | null;
  registrationFields: Field[];
  user?: { name: string; email: string };
  registration?: { status: RegistrationStatus };
  closed: boolean;
}) {
  const boundAction = registerForEvent.bind(null, eventId, slug);
  const [state, action, pending] = useActionState(boundAction, {});
  const currentStatus = (state.status ?? registration?.status) as RegistrationStatus | undefined;
  const [selectValues, setSelectValues] = useState<Record<string, string>>({});

  if (closed) {
    return <section className="apply-card apply-closed">
      <span className="apply-eyebrow">신청 마감</span>
      <h1>신청이 마감됐어요.</h1>
      <p>다른 행사를 둘러보고 새로운 만남을 찾아보세요.</p>
      <div className="apply-actions"><Link className="button button-secondary" href="/events">다른 행사 보기</Link><Link className="button-soft" href={`/events/${slug}`}>행사로 돌아가기</Link></div>
    </section>;
  }

  if (currentStatus === "verification_pending") {
    return <section className="apply-card" data-status="verification_pending"><span className="apply-eyebrow">신청 접수</span><h1>{STATUS_COPY.verification_pending.label}</h1><p>{STATUS_COPY.verification_pending.description}</p></section>;
  }

  if (currentStatus && currentStatus !== "cancelled" && currentStatus !== "rejected") {
    const copy = STATUS_COPY[currentStatus];
    return <section className="apply-card" data-status={currentStatus}>
      <span className={`apply-eyebrow apply-eyebrow-${copy.tone}`}>내 신청</span>
      <h1>{copy.label}</h1>
      <p>{copy.description}</p>
      <div className="apply-status-meta">
        <b>호스트</b><span>{host}</span>
        {capacity && <><b>정원</b><span>{capacity.toLocaleString("ko-KR")}명</span></>}
        <b>승인</b><span>{isPaid ? "입금 확인 후 주최자 승인" : approvalMode === "manual" ? "주최자 승인 후 확정" : "신청 즉시 확정"}</span>
      </div>
      <div className="apply-actions"><Link className="button-soft" href="/my/events">내 신청 내역 보기</Link><form action={cancelEventRegistration.bind(null, eventId, slug)}><button className="button-danger" type="submit">신청 취소</button></form></div>
    </section>;
  }

  if (currentStatus === "rejected" || currentStatus === "cancelled") {
    const copy = STATUS_COPY[currentStatus];
    return <section className="apply-card" data-status={currentStatus}>
      <span className={`apply-eyebrow apply-eyebrow-${copy.tone}`}>이전 신청</span>
      <h1>다시 신청할까요?</h1>
      <p>이전에 <b>{copy.label}</b> 상태였어요. 새 신청 정보를 입력해주세요.</p>
    </section>;
  }

  return <section className="apply-card">
    <span className="apply-eyebrow">Featable 신청</span>
    <h1>{user ? "신청 정보를 입력해주세요" : "신청할게요"}</h1>
    <p>주최자에게는 이름과 이메일, 신청서 답변만 전달돼요. 다른 사용자에게 공개되지 않습니다.</p>

    <dl className="apply-summary">
      <div><dt>호스트</dt><dd>{host}</dd></div>
      {capacity && <div><dt>정원</dt><dd>{capacity.toLocaleString("ko-KR")}명</dd></div>}
      <div><dt>승인</dt><dd>{isPaid ? "입금 확인 후 주최자 승인" : approvalMode === "manual" ? "주최자 승인 후 확정" : "신청 즉시 확정"}</dd></div>
    </dl>

    <form action={action} className="apply-form">
      <div className="apply-form-grid">
        <div className="seed-field"><label>이름</label><input className={input} name="name" defaultValue={user?.name ?? ""} minLength={2} maxLength={60} required placeholder="홍길동" /></div>
        <div className="seed-field"><label>이메일</label><input className={input} name="email" type="email" defaultValue={user?.email ?? ""} maxLength={254} required placeholder="you@example.com" /></div>
      </div>

      {registrationFields.length > 0 && <section className="apply-form-section">
        <header><h2>추가 질문</h2><p>주최자가 추가로 확인하고 싶은 내용이 있어요.</p></header>
        <div className="apply-form-grid">
          {registrationFields.map((field) => <div key={field.id} className="seed-field">
            <label>{field.label}{field.required && <i aria-hidden="true"> *</i>}</label>
            {field.type === "textarea" ? <textarea className={`${input} min-h-24 h-auto py-3 leading-7 resize-y`} name={`custom_${field.id}`} placeholder={field.placeholder ?? ""} maxLength={180} required={field.required} />
              : field.type === "select" ? <SeedSelect name={`custom_${field.id}`} value={selectValues[field.id] ?? ""} onChange={(value) => setSelectValues((current) => ({ ...current, [field.id]: value }))} options={[{ value: "", label: "선택해주세요" }, ...((field.options ?? []).map((option) => ({ value: option, label: option })))]} required={field.required} />
                : <input className={input} name={`custom_${field.id}`} placeholder={field.placeholder ?? ""} maxLength={120} required={field.required} />}
          </div>)}
        </div>
      </section>}

      <div className="seed-field"><label>주최자에게 남길 말 <i aria-hidden="true">(선택)</i></label><textarea className={`${input} min-h-28 h-auto py-3 leading-7 resize-y`} name="note" maxLength={500} placeholder="참여 목적이나 궁금한 점을 적어주세요." /></div>

      {isPaid && <aside className="apply-payment">
        <header><b>입금 안내</b><span>신청 후 입금 확인이 완료돼야 자리가 확정됩니다.</span></header>
        <b className="apply-payment-account">{paymentAccount || "주최자에게 계좌번호를 확인해주세요."}</b>
        <p>{paymentNotice || "입금자명을 신청자 이름과 동일하게 입력해주세요."}</p>
      </aside>}

      <label className="apply-consent"><input name="consented" type="checkbox" required /><span>신청 처리를 위해 이름·이메일·신청서 답변을 <b>{host}</b>에 제공하는 것에 동의합니다. <Link href="/privacy" target="_blank">개인정보 처리방침</Link></span></label>

      {state.error && <p className="apply-error" role="alert">{state.error}</p>}

      <div className="apply-actions">
        <Link className="button-soft" href={`/events/${slug}`}>행사로 돌아가기</Link>
        <button className="button" type="submit" disabled={pending}>{pending ? "신청 중…" : user ? "Featable에서 신청하기" : "신청하기"}</button>
      </div>
      {!user && <p className="apply-login-hint">Featable 회원이에요? <Link href={`/login?next=${encodeURIComponent(`/events/${slug}/apply`)}`}>로그인하면 신청 내역을 한곳에서 볼 수 있어요.</Link></p>}
    </form>
  </section>;
}
