"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isMemberType, safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string };

export async function completeOnboarding(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const memberType = String(formData.get("memberType") ?? "");
  const termsAccepted = formData.get("termsAccepted") === "on";
  const privacyAccepted = formData.get("privacyAccepted") === "on";
  const marketingAccepted = formData.get("marketingAccepted") === "on";
  const next = safeNextPath(String(formData.get("next") ?? "/my"), "/my");

  if (fullName.length < 2 || fullName.length > 40) {
    return { error: "이름은 2자 이상 40자 이하로 입력해주세요." };
  }
  if (!isMemberType(memberType)) {
    return { error: "현재 역할과 가장 가까운 항목을 선택해주세요." };
  }
  if (!termsAccepted || !privacyAccepted) {
    return { error: "필수 약관에 동의해주세요." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      member_type: memberType,
      terms_agreed_at: now,
      privacy_agreed_at: now,
      marketing_agreed_at: marketingAccepted ? now : null,
      onboarding_completed_at: now,
    })
    .eq("id", user.id);

  if (error) return { error: "프로필 저장에 실패했습니다. 잠시 후 다시 시도해주세요." };

  revalidatePath("/", "layout");
  redirect(next === "/" ? "/my" : next);
}

