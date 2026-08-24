"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setMarketingEmailPreference(enabled: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const { error } = await supabase.from("profiles").update({ marketing_agreed_at: enabled ? new Date().toISOString() : null }).eq("id", user.id);
  if (error) return { error: "수신 설정을 변경하지 못했습니다." };
  revalidatePath("/my/settings");
  return {};
}
