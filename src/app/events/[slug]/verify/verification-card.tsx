"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cancelGuestRegistration, verifyGuestRegistration } from "./actions";

const STATUS_COPY = {
  pending: ["신청이 접수됐어요.", "주최자 확인 후 결과를 이메일로 보내드릴게요."],
  confirmed: ["참가가 확정됐어요.", "행사에서 만나요! 상세 내용을 다시 확인해주세요."],
  waitlisted: ["대기 명단에 등록됐어요.", "자리가 생기면 이메일로 알려드릴게요."],
  rejected: ["신청 결과를 확인해주세요.", "이번 신청은 승인되지 않았어요."],
  cancelled: ["신청이 취소됐어요.", "같은 행사에 다시 신청할 수 있습니다."],
} as const;

export function GuestVerificationCard({ slug, token }: { slug: string; token: string }) {
  const [state, verifyAction, verifying] = useActionState(verifyGuestRegistration.bind(null, slug, token), {});
  const [cancelState, cancelAction, cancelling] = useActionState(cancelGuestRegistration.bind(null, slug, token), {});
  const result = cancelState.ok ? cancelState : state;
  const copy = result.status ? STATUS_COPY[result.status] : null;

  if (result.ok && copy) return <section className="event-verification-card status" data-status={result.status}>
    <span>REGISTRATION COMPLETE</span><h1>{copy[0]}</h1><p><strong>{result.eventName}</strong><br />{copy[1]}</p>
    <div><Link className="button" href={`/events/${slug}`}>행사 상세 보기</Link>{result.status !== "cancelled" && <form action={cancelAction}><button className="event-cancel-button" type="submit" disabled={cancelling}>{cancelling ? "취소 중…" : "신청 취소"}</button></form>}</div>
    {cancelState.error && <p className="event-registration-error" role="alert">{cancelState.error}</p>}
  </section>;

  return <section className="event-verification-card">
    <span>EMAIL VERIFICATION</span><h1>행사 신청을 완료할까요?</h1><p>아래 버튼을 누르는 시점에 정원과 신청 상태가 확정됩니다.</p>
    <form action={verifyAction}><button className="button" type="submit" disabled={verifying}>{verifying ? "확인 중…" : "이메일 확인하고 신청 완료"}</button></form>
    {state.error && <p className="event-registration-error" role="alert">{state.error}</p>}
  </section>;
}
