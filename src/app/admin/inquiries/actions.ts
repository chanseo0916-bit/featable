"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewPartnershipInquiryWithClient } from "@/lib/partnership-inquiry-review";

export async function reviewPartnershipInquiry(input: { id: string; decision: "approve" | "reject"; note?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { ok: false as const, error: "관리자 권한이 없습니다." };
  const admin = createAdminClient();
  if (!admin) return { ok: false as const, error: "관리자 서버 설정을 확인할 수 없습니다." };
  const result = await reviewPartnershipInquiryWithClient(admin, { ...input, reviewedBy: user.id });
  revalidatePath("/admin/inquiries");
  revalidatePath("/my");
  return result;
}
