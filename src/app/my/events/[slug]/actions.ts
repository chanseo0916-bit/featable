"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RegistrationField = {
  id: string;
  label: string;
  type: "text" | "select" | "textarea";
  required: boolean;
  placeholder?: string;
  options?: string[];
};

export async function updateEventPresentation(input: {
  eventId: string;
  slug: string;
  name: string;
  host: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  isOnline: boolean;
  category: string;
  capacity: string;
  registrationMode: string;
  applyUrl: string;
  approvalMode: string;
  coverUrl: string;
  galleryUrls: string[];
  registrationFields: RegistrationField[];
  isPaid: boolean;
  paymentAccount: string;
  paymentNotice: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const galleryUrls = input.galleryUrls.filter((url) => {
    try { const parsed = new URL(url); return parsed.protocol === "http:" || parsed.protocol === "https:"; } catch { return false; }
  }).slice(0, 8);
  const registrationFields = input.registrationFields.slice(0, 8).map((field, index) => ({
    id: field.id?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || `field_${index + 1}`,
    label: field.label.trim().slice(0, 60),
    type: ["text", "select", "textarea"].includes(field.type) ? field.type : "text",
    required: Boolean(field.required),
    placeholder: field.placeholder?.trim().slice(0, 100) || undefined,
    options: field.type === "select" ? (field.options ?? []).map((option) => option.trim().slice(0, 60)).filter(Boolean).slice(0, 20) : undefined,
  })).filter((field) => field.label);
  if (input.isPaid && !input.paymentAccount.trim()) return { ok: false, error: "유료 행사에는 입금 계좌번호가 필요합니다." };
  const name = input.name.trim().slice(0, 120);
  const host = input.host.trim().slice(0, 120);
  const startsAt = new Date(input.startsAt);
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  const capacity = input.capacity.trim() ? Number(input.capacity) : null;
  if (!name || !host) return { ok: false, error: "행사명과 주최자명을 입력해주세요." };
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "행사 시작 일시를 확인해주세요." };
  if (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt < startsAt)) return { ok: false, error: "행사 종료 일시는 시작 이후여야 합니다." };
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) return { ok: false, error: "정원은 1명 이상으로 입력해주세요." };
  if (!(["internal", "external", "closed"] as string[]).includes(input.registrationMode)) return { ok: false, error: "신청 방식을 확인해주세요." };
  if (input.registrationMode === "external") {
    try { const url = new URL(input.applyUrl); if (!(["http:", "https:"] as string[]).includes(url.protocol)) throw new Error(); }
    catch { return { ok: false, error: "외부 신청 링크를 확인해주세요." }; }
  }
  const coverUrl = input.coverUrl.trim();
  if (coverUrl) {
    try { const url = new URL(coverUrl); if (!(url.protocol === "http:" || url.protocol === "https:")) throw new Error(); }
    catch { return { ok: false, error: "대표 포스터 주소를 확인해주세요." }; }
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "관리 도구를 준비하지 못했습니다." };
  const { data: event } = await admin.from("events").select("id,submitted_by").eq("id", input.eventId).maybeSingle();
  const { data: cohost } = await admin.from("event_cohosts").select("id").eq("event_id", input.eventId).eq("user_id", user.id).eq("status", "accepted").maybeSingle();
  if (!event || (event.submitted_by !== user.id && !cohost)) return { ok: false, error: "이 행사를 관리할 권한이 없습니다." };
  const { data: updated, error } = await admin.from("events").update({ name, host, description: input.description.trim().slice(0, 10000), starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null, location: input.location.trim().slice(0, 200), is_online: input.isOnline, category: input.category.trim().slice(0, 60) || "기타", capacity, registration_mode: input.registrationMode, apply_url: input.registrationMode === "external" ? input.applyUrl.trim() : null, cover_url: coverUrl || null, gallery_urls: galleryUrls, registration_fields: registrationFields, is_paid: input.isPaid, payment_account: input.isPaid ? input.paymentAccount.trim().slice(0, 200) : null, payment_notice: input.isPaid ? input.paymentNotice.trim().slice(0, 500) || "입금 확인 후 주최자가 신청을 승인합니다." : null, approval_mode: input.isPaid ? "manual" : input.approvalMode === "manual" ? "manual" : "instant" }).eq("id", input.eventId).select("id").maybeSingle();
  if (error || !updated) return { ok: false, error: "행사 설정을 저장하지 못했습니다. SQL 적용 여부를 확인해주세요." };
  revalidatePath(`/events/${input.slug}`);
  revalidatePath(`/events/${input.slug}/apply`);
  revalidatePath(`/my/events/${input.slug}`);
  return { ok: true };
}
