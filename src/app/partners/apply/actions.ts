"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifySlackPartnershipInquiry } from "@/lib/slack";

export type PartnershipInquiryState = { ok?: boolean; error?: string };

const clean = (formData: FormData, key: string, max = 1000) => String(formData.get(key) ?? "").trim().slice(0, max);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isOptionalWebUrl(value: string) {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; }
}

export async function submitPartnershipInquiry(_previous: PartnershipInquiryState, formData: FormData): Promise<PartnershipInquiryState> {
  if (clean(formData, "companyWebsite", 200)) return { ok: true };

  const inquiryType = clean(formData, "inquiryType", 30);
  const organization = clean(formData, "organization", 100);
  const contactName = clean(formData, "contactName", 50);
  const contactEmail = clean(formData, "contactEmail", 160).toLowerCase();
  const contactPhone = clean(formData, "contactPhone", 40);
  const website = clean(formData, "website", 300);
  const objective = clean(formData, "objective", 120);
  const budget = clean(formData, "budget", 80);
  const timeline = clean(formData, "timeline", 80);
  const audience = clean(formData, "audience", 300);
  const communitySize = clean(formData, "communitySize", 80);
  const message = clean(formData, "message", 2000);
  const privacyAccepted = formData.get("privacyAccepted") === "on";

  if (inquiryType !== "advertiser" && inquiryType !== "community_partner") return { error: "문의 유형을 선택해주세요." };
  if (organization.length < 2 || !contactName || !emailPattern.test(contactEmail)) return { error: "기업·커뮤니티명과 담당자 연락처를 확인해주세요." };
  if (!objective || message.length < 10) return { error: "제휴 목적과 문의 내용을 조금 더 자세히 적어주세요." };
  if (!isOptionalWebUrl(website)) return { error: "웹사이트 주소는 http:// 또는 https://로 입력해주세요." };
  if (!privacyAccepted) return { error: "문의 처리를 위한 개인정보 수집에 동의해주세요." };

  const supabase = createAdminClient();
  if (!supabase) return { error: "문의 접수 기능을 준비 중입니다. 잠시 후 다시 시도해주세요." };

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabase.from("partnership_inquiries").select("id", { count: "exact", head: true }).eq("contact_email", contactEmail).gte("created_at", tenMinutesAgo);
  if ((count ?? 0) >= 3) return { error: "짧은 시간에 너무 많은 문의가 접수됐습니다. 잠시 후 다시 시도해주세요." };

  const { data, error } = await supabase.from("partnership_inquiries").insert({ inquiry_type: inquiryType, organization, contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone || null, website: website || null, objective, budget: inquiryType === "advertiser" ? budget || null : null, timeline: timeline || null, audience: audience || null, community_size: inquiryType === "community_partner" ? communitySize || null : null, message, status: "new" }).select("id").single();
  if (error || !data) return { error: "문의 접수에 실패했습니다. 최신 SQL 적용 여부를 확인해주세요." };

  await notifySlackPartnershipInquiry({ id: data.id, inquiryType, organization, contactName, contactEmail, objective, budget: inquiryType === "advertiser" ? budget : communitySize });
  return { ok: true };
}
