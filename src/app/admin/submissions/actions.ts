"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reviewPartnerSubmissionWithClient } from "@/lib/partner-submission-review";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" ? { supabase, user } : null;
}

export async function reviewPartnerSubmission(input: { id: string; decision: "approve" | "reject"; note?: string }): Promise<{ ok: boolean; error?: string; path?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "관리자 권한이 없습니다." };
  const result = await reviewPartnerSubmissionWithClient(admin.supabase, { ...input, reviewedBy: admin.user.id });
  if (!result.ok) return result;
  ["/", "/events", "/support", "/communities", "/sitemap.xml", "/admin/submissions", "/my", "/my/partner/register", result.path].filter(Boolean).forEach((target) => revalidatePath(target!));
  return result;
}
