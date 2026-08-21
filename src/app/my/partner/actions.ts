"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifySlackPartnerSubmission } from "@/lib/slack";

export type PartnerSubmissionType = "event" | "support" | "community";
export type PartnerSubmissionPayload = Record<string, string | boolean>;

export type PartnerSubmissionResult =
  | { ok: true; id: string; status: "draft" | "submitted" }
  | { ok: false; error: string };

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

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
    if (!isWebUrl(clean(payload.applyUrl))) return "신청 링크를 http:// 또는 https://로 입력해주세요.";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("member_type,full_name,email")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.member_type !== "partner") return { ok: false, error: "파트너 계정에서만 등록할 수 있습니다." };
  const partnerName = profile.full_name?.trim() || "Featable 파트너";
  const partnerEmail = profile.email || user.email || "이메일 없음";

  if (!(["event", "support", "community"] as string[]).includes(input.type)) {
    return { ok: false, error: "등록 유형을 확인해주세요." };
  }

  const title = clean(input.payload.name);
  if (input.submit) {
    const validationError = validate(input.type, input.payload);
    if (validationError) return { ok: false, error: validationError };
  }

  const nextStatus = input.submit ? "submitted" : "draft";
  const values = {
    user_id: user.id,
    submission_type: input.type,
    status: nextStatus,
    title,
    payload: input.payload,
    submitted_at: input.submit ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  async function notifySubmitted(id: string) {
    if (!input.submit) return;
    await notifySlackPartnerSubmission({
      id,
      title,
      type: input.type,
      partnerName,
      partnerEmail,
    });
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
