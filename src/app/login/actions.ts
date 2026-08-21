"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { isMemberType, safeNextPath } from "@/lib/auth";
import { notifySlackNewSignup } from "@/lib/slack";

export type AuthState = { error?: string; message?: string };

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/"));

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  revalidatePath("/", "layout");
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed_at) {
    redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const memberType = String(formData.get("memberType") ?? "");
  const termsAccepted = formData.get("termsAccepted") === "on";
  const privacyAccepted = formData.get("privacyAccepted") === "on";
  const marketingAccepted = formData.get("marketingAccepted") === "on";
  const next = safeNextPath(String(formData.get("next") ?? "/my"), "/my");

  if (fullName.length < 2 || fullName.length > 40) {
    return { error: "이름은 2자 이상 40자 이하로 입력해주세요." };
  }
  if (!email || !password || !passwordConfirm) {
    return { error: "이메일과 비밀번호를 모두 입력해주세요." };
  }
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }
  if (password !== passwordConfirm) {
    return { error: "비밀번호가 서로 일치하지 않습니다." };
  }
  if (!isMemberType(memberType)) {
    return { error: "현재 역할과 가장 가까운 항목을 선택해주세요." };
  }
  if (!termsAccepted || !privacyAccepted) {
    return { error: "필수 약관에 동의해주세요." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        full_name: fullName,
        member_type: memberType,
        terms_accepted: true,
        privacy_accepted: true,
        marketing_accepted: marketingAccepted,
      },
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "이미 가입된 이메일입니다. 로그인해주세요." };
    }
    return { error: "가입에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  if (data.user) {
    await notifySlackNewSignup({
      userId: data.user.id,
      name: fullName,
      email,
      memberType,
      marketingAccepted,
    });
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next === "/" ? "/my" : next);
  }

  return {
    message: "가입 확인 메일을 보냈습니다. 이메일 인증을 마치면 바로 시작할 수 있어요.",
  };
}
