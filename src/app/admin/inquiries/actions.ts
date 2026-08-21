"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reviewPartnershipInquiryWithClient } from "@/lib/partnership-inquiry-review";

export async function reviewPartnershipInquiry(input: { id: string; decision: "approve" | "reject"; note?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { ok: false as const, error: "관리자 권한이 없습니다." };
  const result = await reviewPartnershipInquiryWithClient(supabase, { ...input, reviewedBy: user.id });
  revalidatePath("/admin/inquiries");
  return result;
}
