import "server-only";
import { SITE_URL } from "@/lib/site";
import { escapeHtml, sendTransactionalEmail } from "./resend";

export type RegistrationEmailStatus = "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";

const STATUS_COPY: Record<RegistrationEmailStatus, { subject: string; heading: string; description: string }> = {
  pending: { subject: "행사 신청이 접수됐어요", heading: "주최자 확인을 기다리고 있어요.", description: "승인 결과는 이 이메일로 알려드릴게요." },
  confirmed: { subject: "행사 참가가 확정됐어요", heading: "행사에서 만나요!", description: "참가 신청이 정상적으로 확정됐습니다." },
  waitlisted: { subject: "행사 대기자로 등록됐어요", heading: "대기 명단에 등록됐어요.", description: "자리가 생기면 이 이메일로 알려드릴게요." },
  rejected: { subject: "행사 신청 결과를 알려드려요", heading: "이번 신청은 승인되지 않았어요.", description: "다른 Featable 행사를 둘러보세요." },
  cancelled: { subject: "행사 신청이 취소됐어요", heading: "신청 취소를 완료했어요.", description: "같은 행사에 다시 신청할 수 있습니다." },
};

function emailFrame(kicker: string, heading: string, body: string, action?: { href: string; label: string }) {
  const button = action ? `<a href="${escapeHtml(action.href)}" style="display:inline-block;margin-top:24px;padding:13px 20px;border-radius:8px;background:#df4e36;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(action.label)}</a>` : "";
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f4f5f6;font-family:Arial,'Apple SD Gothic Neo',sans-serif;color:#17191b"><div style="max-width:560px;margin:0 auto;padding:40px 20px"><div style="padding:32px;border:1px solid #e1e3e5;border-radius:16px;background:#fff"><strong style="font-size:20px">Featable</strong><p style="margin:36px 0 8px;color:#df4e36;font-size:11px;font-weight:800;letter-spacing:.12em">${escapeHtml(kicker)}</p><h1 style="margin:0;font-size:28px;line-height:1.35">${escapeHtml(heading)}</h1>${body}${button}<p style="margin:36px 0 0;color:#969ca1;font-size:11px;line-height:1.6">본인이 신청하지 않았다면 이 메일을 무시해주세요.</p></div></div></body></html>`;
}

export function sendGuestVerificationEmail(input: { registrationId: string; email: string; name: string; eventName: string; slug: string; token: string }) {
  const confirmationUrl = `${SITE_URL}/events/${encodeURIComponent(input.slug)}/verify?token=${encodeURIComponent(input.token)}`;
  const body = `<p style="margin:18px 0 0;color:#626970;line-height:1.7"><strong>${escapeHtml(input.name)}</strong>님, <strong>${escapeHtml(input.eventName)}</strong> 신청을 완료하려면 이메일을 확인해주세요.<br>링크는 60분 동안 유효합니다.</p>`;
  return sendTransactionalEmail({
    to: input.email,
    subject: `[Featable] ${input.eventName} 신청 이메일을 확인해주세요`,
    html: emailFrame("EMAIL VERIFICATION", "이메일을 확인하면 신청이 완료돼요.", body, { href: confirmationUrl, label: "신청 이메일 확인하기" }),
    text: `${input.name}님, ${input.eventName} 신청을 완료하려면 아래 주소를 열고 확인 버튼을 눌러주세요.\n${confirmationUrl}\n링크는 60분 동안 유효합니다.`,
    idempotencyKey: `event-verification/${input.registrationId}/${input.token.slice(0, 12)}`,
  });
}

export function sendRegistrationStatusEmail(input: { registrationId: string; email: string; name: string; eventName: string; slug: string; status: RegistrationEmailStatus; version?: string }) {
  const copy = STATUS_COPY[input.status];
  const eventUrl = `${SITE_URL}/events/${encodeURIComponent(input.slug)}`;
  const manageUrl = `${SITE_URL}/my/events`;
  // 취소 안내에까지 계정 연결을 권하면 어색하므로 진행 중인 신청에만 붙인다
  const accountNudge = input.status === "cancelled" || input.status === "rejected"
    ? ""
    : `<p style="margin:20px 0 0;padding:14px 16px;border-radius:10px;background:#f7f7f8;color:#626970;font-size:13px;line-height:1.65">이 이메일로 <a href="${escapeHtml(manageUrl)}" style="color:#df4e36;font-weight:700;text-decoration:none">Featable에 로그인</a>하면 신청한 행사를 한곳에서 관리할 수 있어요.</p>`;
  const body = `<p style="margin:18px 0 0;color:#626970;line-height:1.7"><strong>${escapeHtml(input.name)}</strong>님이 신청한 <strong>${escapeHtml(input.eventName)}</strong>의 상태를 알려드려요.<br>${escapeHtml(copy.description)}</p>${accountNudge}`;
  return sendTransactionalEmail({
    to: input.email,
    subject: `[Featable] ${input.eventName} · ${copy.subject}`,
    html: emailFrame("EVENT REGISTRATION", copy.heading, body, { href: eventUrl, label: "행사 상세 보기" }),
    text: `${input.name}님, ${input.eventName}: ${copy.heading} ${copy.description}\n${eventUrl}${accountNudge ? `\n\n신청 내역 관리: ${manageUrl}` : ""}`,
    idempotencyKey: `event-status/${input.registrationId}/${input.status}/${input.version ?? "1"}`,
  });
}

export function sendEventCohostInviteEmail(input: { email: string; name: string; eventName: string; slug: string }) {
  const href = `${SITE_URL}/my/events/${encodeURIComponent(input.slug)}`;
  const body = `<p style="margin:18px 0 0;color:#626970;line-height:1.7"><strong>${escapeHtml(input.name)}</strong>님, <strong>${escapeHtml(input.eventName)}</strong>의 공동 주최자로 추가됐어요.<br>신청자 관리와 행사 설정을 함께 확인할 수 있습니다.</p>`;
  return sendTransactionalEmail({
    to: input.email,
    subject: `[Featable] ${input.eventName} 공동 주최자로 초대됐어요`,
    html: emailFrame("EVENT CO-HOST", "행사를 함께 만들어보세요.", body, { href, label: "행사 관리 열기" }),
    text: `${input.name}님, ${input.eventName}의 공동 주최자로 추가됐어요. 행사 관리: ${href}`,
    idempotencyKey: `event-cohost/${input.slug}/${input.email.toLowerCase()}`,
  });
}
