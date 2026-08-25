import "server-only";
import { escapeHtml, sendTransactionalEmail } from "./resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";

export async function sendEventOrganizerApplicationEmail(input: { eventId: string; registrationId: string; applicantName: string; applicantEmail: string; status: string; isPaid?: boolean }) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data: event } = await admin.from("events").select("name,slug,submitted_by").eq("id", input.eventId).maybeSingle();
  if (!event) return;
  const [{ data: owner }, { data: cohosts }] = await Promise.all([
    admin.from("profiles").select("email").eq("id", event.submitted_by).maybeSingle(),
    admin.from("event_cohosts").select("email").eq("event_id", input.eventId).eq("status", "accepted"),
  ]);
  const recipients = [...new Set([owner?.email, ...(cohosts ?? []).map((cohost) => cohost.email)].filter((email): email is string => Boolean(email)))];
  if (!recipients.length) return;
  const href = `${SITE_URL}/my/events/${encodeURIComponent(event.slug)}`;
  const paymentCopy = input.isPaid ? " 유료 행사라 입금 확인 후 승인해주세요." : "";
  const body = `<p style="margin:18px 0 0;color:#626970;line-height:1.7"><strong>${escapeHtml(event.name)}</strong>에 새 참가 신청이 들어왔습니다.${paymentCopy}</p><p style="margin:10px 0 0;color:#626970;line-height:1.7">신청자: ${escapeHtml(input.applicantName)}<br>이메일: ${escapeHtml(input.applicantEmail)}<br>현재 상태: ${escapeHtml(input.status)}</p>`;
  await Promise.all(recipients.map((to) => sendTransactionalEmail({
    to,
    subject: `[Featable] ${event.name}에 새 참가 신청이 왔어요`,
    html: `<!doctype html><html lang="ko"><body style="margin:0;background:#f4f5f6;font-family:Arial,'Apple SD Gothic Neo',sans-serif;color:#17191b"><div style="max-width:560px;margin:0 auto;padding:40px 20px"><div style="padding:32px;border:1px solid #e1e3e5;border-radius:16px;background:#fff"><strong style="font-size:20px">Featable</strong><p style="margin:36px 0 8px;color:#df4e36;font-size:11px;font-weight:800;letter-spacing:.12em">NEW APPLICATION</p><h1 style="margin:0;font-size:28px;line-height:1.35">새 참가 신청이 도착했어요.</h1>${body}<a href="${href}" style="display:inline-block;margin-top:24px;padding:13px 20px;border-radius:8px;background:#df4e36;color:#fff;text-decoration:none;font-weight:700">신청자 관리 열기</a></div></div></body></html>`,
    text: `${event.name} 새 참가 신청\n신청자: ${input.applicantName} (${input.applicantEmail})\n현재 상태: ${input.status}${input.isPaid ? "\n입금 확인 후 승인해주세요." : ""}\n${href}`,
    idempotencyKey: `event-organizer-application/${input.registrationId}/${to}`,
  })));
}
