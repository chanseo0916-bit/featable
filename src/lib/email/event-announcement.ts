import "server-only";

import { SITE_URL } from "@/lib/site";
import { escapeHtml, sendTransactionalEmail } from "./resend";

export function sendEventAnnouncementEmail(input: {
  announcementId: string;
  registrationId: string;
  email: string;
  recipientName: string;
  eventName: string;
  eventSlug: string;
  organizerName: string;
  subject: string;
  body: string;
}) {
  const eventUrl = `${SITE_URL}/events/${encodeURIComponent(input.eventSlug)}`;
  const emailSubject = `[${input.eventName}] ${input.subject}`.replace(/[\r\n]+/g, " ").trim();
  const message = escapeHtml(input.body).replace(/\r?\n/g, "<br>");
  const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#f4f5f6;font-family:Arial,'Apple SD Gothic Neo',sans-serif;color:#17191b"><div style="max-width:560px;margin:0 auto;padding:40px 20px"><div style="padding:32px;border:1px solid #e1e3e5;border-radius:16px;background:#fff"><strong style="font-size:20px">Featable</strong><p style="margin:36px 0 8px;color:#df4e36;font-size:11px;font-weight:700;letter-spacing:.12em">EVENT NOTICE</p><h1 style="margin:0;font-size:28px;line-height:1.35">${escapeHtml(input.subject)}</h1><p style="margin:18px 0 0;color:#626970;line-height:1.7"><strong>${escapeHtml(input.recipientName)}</strong>님께 <strong>${escapeHtml(input.eventName)}</strong> 운영진이 안내드립니다.</p><div style="margin-top:24px;padding:20px;border-radius:12px;background:#f7f7f8;color:#30343a;font-size:15px;line-height:1.75">${message}</div><a href="${eventUrl}" style="display:inline-block;margin-top:24px;padding:13px 20px;border-radius:8px;background:#df4e36;color:#fff;text-decoration:none;font-weight:700">행사 상세 보기</a><p style="margin:36px 0 0;color:#969ca1;font-size:11px;line-height:1.6">${escapeHtml(input.organizerName)} 운영진이 행사 신청자에게 보낸 운영 안내입니다.</p></div></div></body></html>`;
  return sendTransactionalEmail({
    to: input.email,
    subject: emailSubject,
    html,
    text: `${input.recipientName}님, ${input.eventName} 운영진 안내입니다.\n\n${input.subject}\n\n${input.body}\n\n행사 상세: ${eventUrl}\n보낸 사람: ${input.organizerName}`,
    idempotencyKey: `event-announcement/${input.announcementId}/${input.registrationId}`,
  });
}
