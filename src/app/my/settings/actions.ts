"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setNotificationEmail(email: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { error: "알림을 받을 이메일 주소를 확인해주세요." };
  }

  const { error } = await supabase.from("profiles").update({ notification_email: normalizedEmail }).eq("id", user.id);
  if (error) return { error: "알림 이메일을 저장하지 못했습니다. 최신 SQL 적용 여부를 확인해주세요." };
  revalidatePath("/my/settings");
  return {};
}

export async function setMarketingEmailPreference(enabled: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const { error } = await supabase.from("profiles").update({ marketing_agreed_at: enabled ? new Date().toISOString() : null }).eq("id", user.id);
  if (error) return { error: "수신 설정을 변경하지 못했습니다." };
  revalidatePath("/my/settings");
  return {};
}
