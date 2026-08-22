"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifySlackPartnerSubmission } from "@/lib/slack";
import { randomSuffix, slugify } from "@/lib/slug";

export type PartnerSubmissionType = "event" | "support" | "community";
export type PartnerSubmissionPayload = Record<string, string | boolean | string[]>;

export type PartnerSubmissionResult =
  | { ok: true; id: string; status: "draft" | "submitted" | "approved" }
  | { ok: false; error: string };

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

function eventValues(payload: PartnerSubmissionPayload, slug: string, featured: boolean, submittedBy?: string) {
  return {
    slug,
    name: clean(payload.name),
    host: clean(payload.host),
    starts_at: new Date(clean(payload.startsAt)).toISOString(),
    ends_at: clean(payload.endsAt) ? new Date(clean(payload.endsAt)).toISOString() : null,
    deadline: clean(payload.deadline) ? new Date(clean(payload.deadline)).toISOString() : null,
    location: clean(payload.location) || (Boolean(payload.isOnline) ? "온라인" : ""),
    is_online: Boolean(payload.isOnline),
    fee: clean(payload.fee) || null,
    is_paid: Boolean(payload.isPaid),
    payment_account: Boolean(payload.isPaid) ? clean(payload.paymentAccount) || null : null,
    payment_notice: Boolean(payload.isPaid) ? clean(payload.paymentNotice) || "입금 확인 후 주최자가 신청을 승인합니다." : null,
    category: clean(payload.category) || "기타",
    audience: clean(payload.audience) || null,
    apply_url: payload.registrationMode === "internal" ? null : clean(payload.applyUrl),
    registration_mode: payload.registrationMode === "internal" ? "internal" : "external",
    approval_mode: payload.isPaid ? "manual" : payload.approvalMode === "manual" ? "manual" : "instant",
    capacity: clean(payload.capacity) ? Number(clean(payload.capacity)) : null,
    waitlist_enabled: payload.waitlistEnabled !== false,
    cover_url: clean(payload.coverUrl) || null,
    description: clean(payload.description),
    gallery_urls: Array.isArray(payload.galleryUrls) ? payload.galleryUrls.filter(isWebUrl).slice(0, 8) : [],
    program: parseProgram(clean(payload.program)),
    status: "published" as const,
    is_featured: featured,
    submitted_by: submittedBy ?? null,
  };
}

function parseProgram(value: string) {
  return value.split("\n").map((line) => {
    const [time, title, speaker] = line.split("|").map((part) => part.trim());
    return { time, title: title || time, speaker };
  }).filter((item) => item.title).slice(0, 30);
}

function isWebUrl(value: string) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function validate(type: PartnerSubmissionType, payload: PartnerSubmissionPayload) {
  const title = clean(payload.name);
  if (!title) return "제목 또는 이름을 입력해주세요.";

  if (type === "event") {
    if (!clean(payload.host)) return "주최 기관을 입력해주세요.";
    if (!clean(payload.startsAt) || Number.isNaN(Date.parse(clean(payload.startsAt)))) return "행사 일시를 확인해주세요.";
    if (clean(payload.deadline) && Number.isNaN(Date.parse(clean(payload.deadline)))) return "신청 마감 일시를 확인해주세요.";
    if (clean(payload.deadline) && new Date(clean(payload.deadline)).getTime() > new Date(clean(payload.startsAt)).getTime()) return "신청 마감은 행사 시작 전으로 설정해주세요.";
    if (payload.registrationMode !== "internal" && !isWebUrl(clean(payload.applyUrl))) return "신청 링크를 http:// 또는 https://로 입력해주세요.";
    if (payload.registrationMode === "internal" && clean(payload.capacity)) {
      const capacity = Number(clean(payload.capacity));
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) return "정원은 1명 이상으로 입력해주세요.";
    }
    if (payload.isPaid && !clean(payload.paymentAccount)) return "유료 행사의 입금 계좌번호를 입력해주세요.";
  }

  if (type === "support") {
    if (!clean(payload.agency)) return "운영 기관을 입력해주세요.";
    if (!clean(payload.closeAt)) return "접수 마감일을 입력해주세요.";
    if (!clean(payload.target) || !clean(payload.benefits)) return "모집 대상과 지원 내용을 입력해주세요.";
    if (!isWebUrl(clean(payload.applyUrl))) return "공고 링크를 http:// 또는 https://로 입력해주세요.";
  }

  if (type === "community") {
    if (!clean(payload.intro)) return "커뮤니티 한 줄 소개를 입력해주세요.";
    if (!clean(payload.field)) return "커뮤니티 분야를 입력해주세요.";
    const website = clean(payload.website);
    if (website && !isWebUrl(website)) return "웹사이트 주소를 http:// 또는 https://로 입력해주세요.";
  }

  return null;
}

export async function savePartnerSubmission(input: {
  id?: string;
  type: PartnerSubmissionType;
  payload: PartnerSubmissionPayload;
  submit: boolean;
}): Promise<PartnerSubmissionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const userId = user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("member_type,full_name,email")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.member_type !== "partner" && input.type !== "event") {
    return { ok: false, error: "지원사업과 커뮤니티는 파트너 계정에서 등록할 수 있습니다." };
  }
  const partnerName = profile?.full_name?.trim() || "Featable 파트너";
  const partnerEmail = profile?.email || user.email || "이메일 없음";

  if (!(["event", "support", "community"] as string[]).includes(input.type)) {
    return { ok: false, error: "등록 유형을 확인해주세요." };
  }

  const title = clean(input.payload.name);
  if (input.submit) {
    const validationError = validate(input.type, input.payload);
    if (validationError) return { ok: false, error: validationError };
  }

  const nextStatus = input.submit ? "submitted" : "draft";
  const isStandardEvent = input.type === "event"
    && input.submit
    && input.payload.publishMode !== "featured";
  const values = {
    user_id: userId,
    submission_type: input.type,
    status: nextStatus,
    title,
    payload: input.payload,
    submitted_at: input.submit ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  async function notifySubmitted(id: string) {
    if (!input.submit || isStandardEvent) return;
    await notifySlackPartnerSubmission({
      id,
      title,
      type: input.type,
      partnerName,
      partnerEmail,
    });
  }

  async function publishStandardEvent(submissionId: string) {
    const admin = createAdminClient();
    if (!admin) return { ok: false as const, error: "행사 공개 설정을 확인할 수 없습니다. 잠시 후 다시 시도해주세요." };

    const slug = `${slugify(title) || "event"}-${randomSuffix()}`;
    const path = `/events/${slug}`;
    const { error: eventError } = await admin.from("events").insert(eventValues(input.payload, slug, false, userId));
    if (eventError) return { ok: false as const, error: `행사를 공개하지 못했습니다: ${eventError.message}` };

    const { error: submissionError } = await admin
      .from("partner_submissions")
      .update({
        status: "approved",
        review_note: "일반 행사로 즉시 공개됨",
        reviewed_at: new Date().toISOString(),
        published_path: path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId)
      .eq("user_id", userId);
    if (submissionError) return { ok: false as const, error: "행사는 공개됐지만 등록 내역 연결에 실패했습니다." };

    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath(path);
    revalidatePath("/sitemap.xml");
    return { ok: true as const, path };
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("partner_submissions")
      .update(values)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .in("status", ["draft", "rejected"])
      .select("id")
      .maybeSingle();
    if (error || !data) return { ok: false, error: "저장하지 못했습니다. 이미 검수 중인 제안인지 확인해주세요." };
    if (isStandardEvent) {
      const published = await publishStandardEvent(data.id);
      if (!published.ok) return published;
      revalidatePath("/my");
      revalidatePath("/my/partner/register");
      return { ok: true, id: data.id, status: "approved" };
    }
    await notifySubmitted(data.id);
    revalidatePath("/my");
    revalidatePath("/my/partner/register");
    revalidatePath("/admin/submissions");
    return { ok: true, id: data.id, status: nextStatus };
  }

  const { data, error } = await supabase
    .from("partner_submissions")
    .insert(values)
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "등록 도구를 사용할 수 없습니다. 최신 SQL 적용 여부를 확인해주세요." };

  if (isStandardEvent) {
    const published = await publishStandardEvent(data.id);
    if (!published.ok) return published;
    revalidatePath("/my");
    revalidatePath("/my/partner/register");
    return { ok: true, id: data.id, status: "approved" };
  }
  await notifySubmitted(data.id);

  revalidatePath("/my");
  revalidatePath("/my/partner/register");
  revalidatePath("/admin/submissions");
  return { ok: true, id: data.id, status: nextStatus };
}

export async function deletePartnerSubmission(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("partner_submissions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .in("status", ["draft", "rejected"]);
  if (error) return { ok: false, error: "초안을 삭제하지 못했습니다." };
  revalidatePath("/my");
  revalidatePath("/my/partner/register");
  return { ok: true };
}
