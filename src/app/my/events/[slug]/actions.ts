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

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "관리 도구를 준비하지 못했습니다." };
  const { data: event } = await admin.from("events").select("id,submitted_by").eq("id", input.eventId).maybeSingle();
  if (!event || event.submitted_by !== user.id) return { ok: false, error: "이 행사를 관리할 권한이 없습니다." };
  const { error } = await admin.from("events").update({ gallery_urls: galleryUrls, registration_fields: registrationFields, is_paid: input.isPaid, payment_account: input.isPaid ? input.paymentAccount.trim().slice(0, 200) : null, payment_notice: input.isPaid ? input.paymentNotice.trim().slice(0, 500) || "입금 확인 후 주최자가 신청을 승인합니다." : null, approval_mode: input.isPaid ? "manual" : undefined }).eq("id", input.eventId);
  if (error) return { ok: false, error: "행사 설정을 저장하지 못했습니다. SQL 적용 여부를 확인해주세요." };
  revalidatePath(`/events/${input.slug}`);
  revalidatePath(`/events/${input.slug}/apply`);
  revalidatePath(`/my/events/${input.slug}`);
  return { ok: true };
}
