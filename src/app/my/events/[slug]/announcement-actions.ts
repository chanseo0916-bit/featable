"use server";

import { setTimeout as wait } from "node:timers/promises";
import { revalidatePath } from "next/cache";
import { sendEventAnnouncementEmail } from "@/lib/email/event-announcement";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AnnouncementRecipientFilter = "active" | "confirmed" | "pending" | "waitlisted";

type AnnouncementInput = {
  eventId: string;
  eventSlug: string;
  recipientFilter: AnnouncementRecipientFilter;
  subject: string;
  body: string;
};

const STATUS_FILTERS: Record<AnnouncementRecipientFilter, string[]> = {
  active: ["pending", "confirmed", "waitlisted"],
  confirmed: ["confirmed"],
  pending: ["pending"],
  waitlisted: ["waitlisted"],
};

export async function sendEventAnnouncement(input: AnnouncementInput): Promise<
  | { ok: true; recipientCount: number; deliveredCount: number; failedCount: number }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!input || typeof input !== "object") return { ok: false, error: "공지 내용을 확인해주세요." };
  const eventId = typeof input.eventId === "string" ? input.eventId.trim() : "";
  const eventSlug = typeof input.eventSlug === "string" ? input.eventSlug.trim() : "";
  const rawRecipientFilter = typeof input.recipientFilter === "string" ? input.recipientFilter : "";
  if (!eventId || !eventSlug) return { ok: false, error: "행사 정보를 확인해주세요." };
  if (!Object.hasOwn(STATUS_FILTERS, rawRecipientFilter)) return { ok: false, error: "수신 대상을 확인해주세요." };
  const recipientFilter = rawRecipientFilter as AnnouncementRecipientFilter;
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (subject.length < 5 || subject.length > 80) return { ok: false, error: "제목은 5~80자로 작성해주세요." };
  if (/[\r\n]/.test(subject)) return { ok: false, error: "제목에는 줄바꿈을 넣을 수 없습니다." };
  if (body.length < 10 || body.length > 4000) return { ok: false, error: "본문은 10~4,000자로 작성해주세요." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "메일 발송 도구를 준비하지 못했습니다." };

  const { data: announcementId, error: createError } = await supabase.rpc("create_event_announcement", {
    p_event_id: eventId,
    p_recipient_filter: recipientFilter,
    p_subject: subject,
    p_body: body,
  });
  if (createError || typeof announcementId !== "string") {
    const error = createError?.message ?? "";
    if (error.includes("announcement_rate_limited")) return { ok: false, error: "중복 발송을 막기 위해 공지 메일은 1분 뒤 다시 보낼 수 있어요." };
    if (error.includes("forbidden")) return { ok: false, error: "이 행사의 공지를 보낼 권한이 없습니다." };
    return { ok: false, error: "공지 발송을 시작하지 못했습니다. migration-58 적용 여부를 확인해주세요." };
  }

  const [{ data: event }, { data: profile }, { data: registrationRows }] = await Promise.all([
    admin.from("events").select("id,slug,name,host").eq("id", eventId).eq("slug", eventSlug).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    admin.from("event_registrations")
      .select("id,applicant_name,applicant_email,status")
      .eq("event_id", eventId)
      .in("status", STATUS_FILTERS[recipientFilter])
      .order("applied_at", { ascending: true }),
  ]);
  if (!event) {
    await admin.from("event_announcements").update({ status: "failed", failed_count: 1, sent_at: new Date().toISOString() }).eq("id", announcementId);
    return { ok: false, error: "행사를 찾지 못했습니다." };
  }

  const seen = new Set<string>();
  const recipients = (registrationRows ?? []).filter((registration) => {
    const email = registration.applicant_email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  if (!recipients.length) {
    await admin.from("event_announcements").update({ status: "failed", recipient_count: 0, sent_at: new Date().toISOString() }).eq("id", announcementId);
    return { ok: false, error: "선택한 상태에 발송할 신청자가 없습니다." };
  }
  if (recipients.length > 100) {
    await admin.from("event_announcements").update({ status: "failed", recipient_count: recipients.length, sent_at: new Date().toISOString() }).eq("id", announcementId);
    return { ok: false, error: "한 번에 최대 100명까지 발송할 수 있어요. 수신 대상을 나눠서 보내주세요." };
  }

  let deliveredCount = 0;
  let failedCount = 0;
  for (let index = 0; index < recipients.length; index += 2) {
    const batch = recipients.slice(index, index + 2);
    const results = await Promise.all(batch.map((registration) => sendEventAnnouncementEmail({
      announcementId,
      registrationId: registration.id,
      email: registration.applicant_email.trim(),
      recipientName: registration.applicant_name,
      eventName: event.name,
      eventSlug: event.slug,
      organizerName: profile?.full_name?.trim() || event.host,
      subject,
      body,
    })));
    deliveredCount += results.filter((result) => result.ok).length;
    failedCount += results.filter((result) => !result.ok).length;
    if (index + 2 < recipients.length) await wait(550);
  }

  const status = deliveredCount === recipients.length ? "sent" : deliveredCount > 0 ? "partial" : "failed";
  await admin.from("event_announcements").update({
    status,
    recipient_count: recipients.length,
    delivered_count: deliveredCount,
    failed_count: failedCount,
    sent_at: new Date().toISOString(),
  }).eq("id", announcementId);

  revalidatePath(`/my/events/${eventSlug}`);
  return { ok: true, recipientCount: recipients.length, deliveredCount, failedCount };
}
